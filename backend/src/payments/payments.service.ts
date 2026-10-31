import {
  BadGatewayException,
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../database/prisma.service';
import { RecordPaymentDto } from './dto/record-payment.dto';
import { VerifyRazorpayPaymentDto } from './dto/verify-razorpay-payment.dto';

const paymentInclude = {
  allocations: {
    include: {
      invoice: { select: { id: true, invoiceNumber: true, amountDue: true } },
    },
  },
  customer: {
    select: { id: true, email: true, firstName: true, lastName: true },
  },
} satisfies Prisma.PaymentInclude;

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(private readonly prisma: PrismaService) {}

  list() {
    return this.prisma.payment.findMany({
      include: paymentInclude,
      orderBy: [{ receivedAt: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async record(dto: RecordPaymentDto, actorId: string) {
    const amount = new Prisma.Decimal(dto.amount);
    const allocations = dto.allocations ?? [];
    const allocatedAmount = allocations.reduce(
      (total, allocation) => total.plus(allocation.amount),
      new Prisma.Decimal(0),
    );
    if (allocatedAmount.greaterThan(amount)) {
      throw new BadRequestException(
        'allocations cannot exceed the payment amount',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const customer = await tx.user.findFirst({
        where: { id: dto.customerId, role: 'CUSTOMER', isActive: true },
        select: { id: true },
      });
      if (!customer) throw new NotFoundException('active customer not found');

      const payment = await tx.payment.create({
        data: {
          paymentReference: dto.paymentReference.trim(),
          customerId: customer.id,
          paymentMethod: dto.paymentMethod.trim(),
          receivedAt: new Date(dto.receivedAt),
          amount,
          notes: dto.notes?.trim() || null,
        },
      });

      for (const allocation of allocations) {
        const allocationAmount = new Prisma.Decimal(allocation.amount);
        const updated = await tx.invoice.updateMany({
          where: {
            id: allocation.invoiceId,
            customerId: customer.id,
            status: 'CONFIRMED',
            amountDue: { gte: allocationAmount },
          },
          data: {
            paidAmount: { increment: allocationAmount },
            amountDue: { decrement: allocationAmount },
          },
        });
        if (updated.count !== 1) {
          throw new BadRequestException(
            `invoice ${allocation.invoiceId} is unavailable, belongs to another customer, or has insufficient balance`,
          );
        }

        await tx.paymentAllocation.create({
          data: {
            paymentId: payment.id,
            invoiceId: allocation.invoiceId,
            allocatedAmount: allocationAmount,
          },
        });
        await tx.invoice.updateMany({
          where: {
            id: allocation.invoiceId,
            customerId: customer.id,
            status: 'CONFIRMED',
            amountDue: 0,
          },
          data: { status: 'PAID' },
        });
      }

      await tx.auditLog.create({
        data: {
          actorId,
          action: 'PAYMENT_RECORDED',
          entityType: 'PAYMENT',
          entityId: payment.id,
          afterData: {
            customerId: customer.id,
            paymentReference: payment.paymentReference,
            amount: amount.toString(),
            allocatedAmount: allocatedAmount.toString(),
          },
        },
      });

      return tx.payment.findUniqueOrThrow({
        where: { id: payment.id },
        include: paymentInclude,
      });
    });
  }

  async createRazorpayOrder(invoiceId: string, customerId: string) {
    const { keyId, keySecret } = razorpayCredentials();
    const currency = process.env.RAZORPAY_CURRENCY ?? 'INR';
    if (currency !== 'INR') {
      throw new ServiceUnavailableException(
        'Razorpay checkout currently supports INR invoices only',
      );
    }

    const invoice = await this.prisma.invoice.findFirst({
      where: {
        id: invoiceId,
        customerId,
        status: 'CONFIRMED',
        amountDue: { gt: 0 },
      },
      select: {
        id: true,
        invoiceNumber: true,
        amountDue: true,
      },
    });
    if (!invoice) {
      throw new NotFoundException('payable invoice not found');
    }

    const amountMinorDecimal = invoice.amountDue.mul(100);
    if (!amountMinorDecimal.isInteger()) {
      throw new BadRequestException(
        'invoice amount cannot be represented in Indian paise',
      );
    }
    const amountMinor = amountMinorDecimal.toNumber();
    if (!Number.isSafeInteger(amountMinor) || amountMinor <= 0) {
      throw new BadRequestException('invoice amount is outside gateway limits');
    }

    const pending = await this.prisma.razorpayOrder.findFirst({
      where: { invoiceId, customerId, status: 'PENDING' },
      orderBy: { createdAt: 'desc' },
    });
    if (pending) {
      if (pending.amountMinor !== amountMinor || pending.currency !== currency) {
        throw new BadRequestException(
          'invoice balance changed; refresh the invoice before checkout',
        );
      }
      return {
        keyId,
        orderId: pending.orderId,
        amount: pending.amountMinor,
        currency: pending.currency,
        invoiceNumber: invoice.invoiceNumber,
      };
    }

    const gatewayOrder = await razorpayRequest(
      '/orders',
      keyId,
      keySecret,
      {
        method: 'POST',
        body: JSON.stringify({
          amount: amountMinor,
          currency,
          receipt: `BL-${randomUUID().replaceAll('-', '')}`,
          notes: { invoiceNumber: invoice.invoiceNumber },
        }),
      },
    );
    if (
      !isRecord(gatewayOrder) ||
      typeof gatewayOrder.id !== 'string' ||
      gatewayOrder.amount !== amountMinor ||
      gatewayOrder.currency !== currency
    ) {
      this.logger.error('Razorpay returned an invalid order response');
      throw new BadGatewayException('payment gateway returned an invalid order');
    }

    try {
      await this.prisma.razorpayOrder.create({
        data: {
          orderId: gatewayOrder.id,
          invoiceId,
          customerId,
          amountMinor,
          currency,
        },
      });
    } catch (error) {
      if (
        !(error instanceof Prisma.PrismaClientKnownRequestError) ||
        error.code !== 'P2002'
      ) {
        throw error;
      }

      const concurrentOrder = await this.prisma.razorpayOrder.findFirst({
        where: { invoiceId, customerId, status: 'PENDING' },
        orderBy: { createdAt: 'desc' },
      });
      if (
        !concurrentOrder ||
        concurrentOrder.amountMinor !== amountMinor ||
        concurrentOrder.currency !== currency
      ) {
        throw error;
      }
      return {
        keyId,
        orderId: concurrentOrder.orderId,
        amount: concurrentOrder.amountMinor,
        currency: concurrentOrder.currency,
        invoiceNumber: invoice.invoiceNumber,
      };
    }

    return {
      keyId,
      orderId: gatewayOrder.id,
      amount: amountMinor,
      currency,
      invoiceNumber: invoice.invoiceNumber,
    };
  }

  async verifyRazorpayPayment(dto: VerifyRazorpayPaymentDto, customerId: string) {
    const { keyId, keySecret } = razorpayCredentials();
    const order = await this.prisma.razorpayOrder.findFirst({
      where: { orderId: dto.razorpay_order_id, customerId },
    });
    if (!order) throw new NotFoundException('payment order not found');

    const expectedSignature = createHmac('sha256', keySecret)
      .update(`${dto.razorpay_order_id}|${dto.razorpay_payment_id}`)
      .digest();
    if (!isValidSignature(dto.razorpay_signature, expectedSignature)) {
      throw new UnauthorizedException('payment signature is invalid');
    }

    if (order.status === 'PAID') {
      if (order.paymentId !== dto.razorpay_payment_id) {
        throw new BadRequestException(
          'payment order was already settled with another payment',
        );
      }
      return this.prisma.payment.findUniqueOrThrow({
        where: { paymentReference: dto.razorpay_payment_id },
        include: paymentInclude,
      });
    }

    const gatewayPayment = await razorpayRequest(
      `/payments/${encodeURIComponent(dto.razorpay_payment_id)}`,
      keyId,
      keySecret,
    );
    if (
      !isRecord(gatewayPayment) ||
      gatewayPayment.id !== dto.razorpay_payment_id ||
      gatewayPayment.order_id !== order.orderId ||
      gatewayPayment.amount !== order.amountMinor ||
      gatewayPayment.currency !== order.currency ||
      gatewayPayment.status !== 'captured' ||
      gatewayPayment.captured !== true
    ) {
      throw new BadRequestException(
        'Razorpay has not confirmed a captured payment for this invoice',
      );
    }

    return this.settleCapturedOrder(
      order.orderId,
      dto.razorpay_payment_id,
      customerId,
      order.amountMinor,
      order.currency,
    );
  }

  async processRazorpayWebhook(
    rawBody: Buffer | undefined,
    signature: string | undefined,
    payload: unknown,
  ) {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!webhookSecret) {
      throw new ServiceUnavailableException(
        'Razorpay webhook verification is not configured',
      );
    }
    if (
      !rawBody ||
      !signature ||
      !isValidSignature(
        signature,
        createHmac('sha256', webhookSecret).update(rawBody).digest(),
      )
    ) {
      throw new UnauthorizedException('Razorpay webhook signature is invalid');
    }
    if (
      !isRecord(payload) ||
      payload.event !== 'payment.captured' ||
      !isRecord(payload.payload) ||
      !isRecord(payload.payload.payment) ||
      !isRecord(payload.payload.payment.entity)
    ) {
      return { received: true };
    }

    const gatewayPayment = payload.payload.payment.entity;
    if (
      typeof gatewayPayment.id !== 'string' ||
      typeof gatewayPayment.order_id !== 'string' ||
      typeof gatewayPayment.amount !== 'number' ||
      typeof gatewayPayment.currency !== 'string' ||
      gatewayPayment.status !== 'captured'
    ) {
      throw new BadRequestException(
        'Razorpay captured-payment webhook has an invalid payload',
      );
    }
    const order = await this.prisma.razorpayOrder.findUnique({
      where: { orderId: gatewayPayment.order_id },
    });
    if (!order) return { received: true };
    if (
      order.amountMinor !== gatewayPayment.amount ||
      order.currency !== gatewayPayment.currency
    ) {
      throw new BadRequestException(
        'Razorpay captured-payment details do not match the stored order',
      );
    }
    await this.settleCapturedOrder(
      order.orderId,
      gatewayPayment.id,
      order.customerId,
      order.amountMinor,
      order.currency,
    );
    return { received: true };
  }

  private settleCapturedOrder(
    orderId: string,
    paymentId: string,
    customerId: string,
    amountMinor: number,
    currency: string,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const currentOrder = await tx.razorpayOrder.findUnique({
        where: { orderId },
      });
      if (!currentOrder || currentOrder.customerId !== customerId) {
        throw new NotFoundException('payment order not found');
      }
      if (
        currentOrder.amountMinor !== amountMinor ||
        currentOrder.currency !== currency
      ) {
        throw new BadRequestException(
          'captured payment does not match the stored order',
        );
      }
      if (currentOrder.status === 'PAID') {
        if (currentOrder.paymentId !== paymentId) {
          throw new BadRequestException(
            'payment order was already settled with another payment',
          );
        }
        return tx.payment.findUniqueOrThrow({
          where: { paymentReference: paymentId },
          include: paymentInclude,
        });
      }

      const amount = new Prisma.Decimal(currentOrder.amountMinor).div(100);
      const invoiceUpdate = await tx.invoice.updateMany({
        where: {
          id: currentOrder.invoiceId,
          customerId,
          status: 'CONFIRMED',
          amountDue: { gte: amount },
        },
        data: {
          paidAmount: { increment: amount },
          amountDue: { decrement: amount },
        },
      });
      if (invoiceUpdate.count !== 1) {
        throw new BadRequestException(
          'invoice balance changed after checkout; contact the billing team',
        );
      }
      await tx.invoice.updateMany({
        where: {
          id: currentOrder.invoiceId,
          customerId,
          status: 'CONFIRMED',
          amountDue: 0,
        },
        data: { status: 'PAID' },
      });

      const payment = await tx.payment.create({
        data: {
          paymentReference: paymentId,
          customerId,
          paymentMethod: 'RAZORPAY',
          receivedAt: new Date(),
          amount,
          notes: `Razorpay order ${currentOrder.orderId}`,
          allocations: {
            create: {
              invoiceId: currentOrder.invoiceId,
              allocatedAmount: amount,
            },
          },
        },
        include: paymentInclude,
      });
      const claimed = await tx.razorpayOrder.updateMany({
        where: { id: currentOrder.id, status: 'PENDING', paymentId: null },
        data: { status: 'PAID', paymentId, paidAt: new Date() },
      });
      if (claimed.count !== 1) {
        throw new BadRequestException(
          'payment order was settled concurrently; reload the invoice',
        );
      }
      await tx.auditLog.create({
        data: {
          actorId: customerId,
          action: 'RAZORPAY_PAYMENT_VERIFIED',
          entityType: 'PAYMENT',
          entityId: payment.id,
          afterData: {
            invoiceId: currentOrder.invoiceId,
            orderId: currentOrder.orderId,
            paymentId,
            amount: amount.toString(),
          },
        },
      });
      return payment;
    });
  }
}

function razorpayCredentials() {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) {
    throw new ServiceUnavailableException(
      'online payments are not configured; contact the billing team',
    );
  }
  return { keyId, keySecret };
}

async function razorpayRequest(
  path: string,
  keyId: string,
  keySecret: string,
  init?: RequestInit,
): Promise<unknown> {
  let response: Response;
  try {
    response = await fetch(`https://api.razorpay.com/v1${path}`, {
      ...init,
      headers: {
        Authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString('base64')}`,
        'Content-Type': 'application/json',
        ...init?.headers,
      },
      signal: AbortSignal.timeout(10_000),
    });
  } catch (error) {
    throw new BadGatewayException('unable to reach the payment gateway', {
      cause: error,
    });
  }
  if (!response.ok) {
    const requestId = response.headers.get('x-razorpay-request-id');
    throw new BadGatewayException(
      requestId
        ? `payment gateway rejected the request (${requestId})`
        : 'payment gateway rejected the request',
    );
  }
  return response.json();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isValidSignature(signature: string, expected: Buffer): boolean {
  if (!/^[\da-f]{64}$/i.test(signature)) return false;
  const received = Buffer.from(signature, 'hex');
  return received.length === expected.length && timingSafeEqual(received, expected);
}
