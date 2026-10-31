import { createHmac } from 'node:crypto';
import { afterEach, describe, expect, it, jest } from '@jest/globals';

class MockHttpException extends Error {}

jest.mock('@nestjs/common', () => ({
  Injectable: () => (target: unknown) => target,
  Logger: class {
    error = jest.fn();
  },
  BadGatewayException: MockHttpException,
  BadRequestException: MockHttpException,
  NotFoundException: MockHttpException,
  ServiceUnavailableException: MockHttpException,
  UnauthorizedException: MockHttpException,
}));

import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../database/prisma.service';
import { PaymentsService } from './payments.service';

describe('PaymentsService Razorpay checkout', () => {
  const resolved = <T>(value: T) =>
    jest.fn<() => Promise<T>>().mockResolvedValue(value);
  const savedKeyId = process.env.RAZORPAY_KEY_ID;
  const savedKeySecret = process.env.RAZORPAY_KEY_SECRET;
  const savedWebhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    if (savedKeyId === undefined) delete process.env.RAZORPAY_KEY_ID;
    else process.env.RAZORPAY_KEY_ID = savedKeyId;
    if (savedKeySecret === undefined) delete process.env.RAZORPAY_KEY_SECRET;
    else process.env.RAZORPAY_KEY_SECRET = savedKeySecret;
    if (savedWebhookSecret === undefined) delete process.env.RAZORPAY_WEBHOOK_SECRET;
    else process.env.RAZORPAY_WEBHOOK_SECRET = savedWebhookSecret;
    globalThis.fetch = originalFetch;
  });

  it('creates an INR order only for a customer-owned confirmed invoice', async () => {
    process.env.RAZORPAY_KEY_ID = 'rzp_test_public';
    process.env.RAZORPAY_KEY_SECRET = 'test-secret';
    globalThis.fetch = jest.fn<typeof fetch>().mockResolvedValue(
      jsonResponse({
        id: 'order_test_1',
        amount: 12550,
        currency: 'INR',
      }),
    );
    const invoice = {
      id: 'invoice-1',
      invoiceNumber: 'INV-1',
      amountDue: new Prisma.Decimal('125.50'),
    };
    const prisma = {
      invoice: { findFirst: resolved(invoice) },
      razorpayOrder: {
        findFirst: resolved(null),
        create: resolved({ id: 'stored-order' }),
      },
    } as unknown as PrismaService;

    await expect(
      new PaymentsService(prisma).createRazorpayOrder('invoice-1', 'customer-1'),
    ).resolves.toEqual({
      keyId: 'rzp_test_public',
      orderId: 'order_test_1',
      amount: 12550,
      currency: 'INR',
      invoiceNumber: 'INV-1',
    });
    expect(prisma.invoice.findFirst).toHaveBeenCalledWith({
      where: {
        id: 'invoice-1',
        customerId: 'customer-1',
        status: 'CONFIRMED',
        amountDue: { gt: 0 },
      },
      select: { id: true, invoiceNumber: true, amountDue: true },
    });
    expect(prisma.razorpayOrder.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        orderId: 'order_test_1',
        invoiceId: 'invoice-1',
        customerId: 'customer-1',
        amountMinor: 12550,
        currency: 'INR',
      }),
    });
  });

  it('verifies the payment signature and captured gateway amount before allocation', async () => {
    process.env.RAZORPAY_KEY_ID = 'rzp_test_public';
    process.env.RAZORPAY_KEY_SECRET = 'test-secret';
    const order = {
      id: 'db-order-id',
      orderId: 'order_test_2',
      invoiceId: 'invoice-2',
      customerId: 'customer-2',
      amountMinor: 10000,
      currency: 'INR',
      status: 'PENDING',
    };
    globalThis.fetch = jest.fn<typeof fetch>().mockResolvedValue(
      jsonResponse({
        id: 'pay_test_2',
        order_id: order.orderId,
        amount: order.amountMinor,
        currency: order.currency,
        status: 'captured',
        captured: true,
      }),
    );

    const payment = { id: 'payment-2', paymentReference: 'pay_test_2' };
    const tx = {
      razorpayOrder: {
        findUnique: resolved(order),
        updateMany: resolved({ count: 1 }),
      },
      invoice: { updateMany: resolved({ count: 1 }) },
      payment: {
        create: resolved(payment),
        findUniqueOrThrow: resolved(payment),
      },
      auditLog: { create: resolved({ id: 'audit-2' }) },
    };
    const prisma = {
      razorpayOrder: { findFirst: resolved(order) },
      $transaction: jest.fn(
        <T>(callback: (transaction: typeof tx) => Promise<T>) => callback(tx),
      ),
    } as unknown as PrismaService;
    const signature = createHmac('sha256', 'test-secret')
      .update(`${order.orderId}|pay_test_2`)
      .digest('hex');

    await expect(
      new PaymentsService(prisma).verifyRazorpayPayment(
        {
          razorpay_order_id: order.orderId,
          razorpay_payment_id: 'pay_test_2',
          razorpay_signature: signature,
        },
        'customer-2',
      ),
    ).resolves.toBe(payment);
    expect(tx.invoice.updateMany).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        where: expect.objectContaining({
          id: 'invoice-2',
          customerId: 'customer-2',
          status: 'CONFIRMED',
          amountDue: { gte: new Prisma.Decimal(100) },
        }),
      }),
    );
    expect(tx.payment.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          paymentReference: 'pay_test_2',
          customerId: 'customer-2',
          paymentMethod: 'RAZORPAY',
          amount: new Prisma.Decimal(100),
        }),
      }),
    );
    expect(tx.auditLog.create).toHaveBeenCalled();
  });

  it('rejects a forged signature without contacting the gateway or writing records', async () => {
    process.env.RAZORPAY_KEY_ID = 'rzp_test_public';
    process.env.RAZORPAY_KEY_SECRET = 'test-secret';
    const order = {
      id: 'db-order-id',
      orderId: 'order_test_3',
      status: 'PENDING',
    };
    const fetch = jest.fn<typeof globalThis.fetch>();
    globalThis.fetch = fetch;
    const transaction = jest.fn();
    const prisma = {
      razorpayOrder: { findFirst: resolved(order) },
      $transaction: transaction,
    } as unknown as PrismaService;

    await expect(
      new PaymentsService(prisma).verifyRazorpayPayment(
        {
          razorpay_order_id: order.orderId,
          razorpay_payment_id: 'pay_test_3',
          razorpay_signature: '0'.repeat(64),
        },
        'customer-3',
      ),
    ).rejects.toThrow('payment signature is invalid');
    expect(fetch).not.toHaveBeenCalled();
    expect(transaction).not.toHaveBeenCalled();
  });

  it('settles captured webhook events using the exact raw body', async () => {
    process.env.RAZORPAY_WEBHOOK_SECRET = 'webhook-secret';
    const payload = {
      event: 'payment.captured',
      payload: {
        payment: {
          entity: {
            id: 'pay_webhook_1',
            order_id: 'order_webhook_1',
            amount: 25000,
            currency: 'INR',
            status: 'captured',
          },
        },
      },
    };
    const rawBody = Buffer.from(JSON.stringify(payload));
    const signature = createHmac('sha256', 'webhook-secret')
      .update(rawBody)
      .digest('hex');
    const order = {
      id: 'db-webhook-order',
      orderId: 'order_webhook_1',
      invoiceId: 'invoice-webhook-1',
      customerId: 'customer-webhook-1',
      amountMinor: 25000,
      currency: 'INR',
      status: 'PENDING',
    };
    const payment = { id: 'payment-webhook-1', paymentReference: 'pay_webhook_1' };
    const tx = {
      razorpayOrder: {
        findUnique: resolved(order),
        updateMany: resolved({ count: 1 }),
      },
      invoice: { updateMany: resolved({ count: 1 }) },
      payment: {
        create: resolved(payment),
        findUniqueOrThrow: resolved(payment),
      },
      auditLog: { create: resolved({ id: 'audit-webhook-1' }) },
    };
    const prisma = {
      razorpayOrder: { findUnique: resolved(order) },
      $transaction: jest.fn(
        <T>(callback: (transaction: typeof tx) => Promise<T>) => callback(tx),
      ),
    } as unknown as PrismaService;

    await expect(
      new PaymentsService(prisma).processRazorpayWebhook(
        rawBody,
        signature,
        payload,
      ),
    ).resolves.toEqual({ received: true });
    expect(tx.payment.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          paymentReference: 'pay_webhook_1',
          paymentMethod: 'RAZORPAY',
        }),
      }),
    );
    expect(tx.invoice.updateMany).toHaveBeenCalled();
  });
});

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
}
