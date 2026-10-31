import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../database/prisma.service';
import { RecordPaymentDto } from './dto/record-payment.dto';

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
}
