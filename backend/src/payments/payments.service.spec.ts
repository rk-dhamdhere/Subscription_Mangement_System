import { describe, expect, it, jest } from '@jest/globals';

class MockHttpException extends Error {}

jest.mock('@nestjs/common', () => ({
  Injectable: () => (target: unknown) => target,
  Logger: class {
    error = jest.fn();
  },
  BadRequestException: MockHttpException,
  NotFoundException: MockHttpException,
}));

import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../database/prisma.service';
import { RecordPaymentDto } from './dto/record-payment.dto';
import { PaymentsService } from './payments.service';

describe('PaymentsService', () => {
  const resolved = <T>(value: T) =>
    jest.fn<() => Promise<T>>().mockResolvedValue(value);

  it('records a payment, allocates a partial balance, and audits it transactionally', async () => {
    const payment = {
      id: 'payment-id',
      paymentReference: 'PAY-1',
    };
    const result = { ...payment, allocations: [] };
    const tx = {
      user: { findFirst: resolved({ id: 'customer-id' }) },
      payment: {
        create: resolved(payment),
        findUniqueOrThrow: resolved(result),
      },
      invoice: {
        updateMany: resolved({ count: 1 }),
      },
      paymentAllocation: {
        create: resolved({ id: 'allocation-id' }),
      },
      auditLog: { create: resolved({ id: 'audit-id' }) },
    };
    const prisma = {
      $transaction: jest.fn(
        <T>(callback: (transaction: typeof tx) => Promise<T>) => callback(tx),
      ),
    } as unknown as PrismaService;
    const dto: RecordPaymentDto = {
      customerId: 'customer-id',
      paymentReference: 'PAY-1',
      paymentMethod: 'BANK_TRANSFER',
      receivedAt: '2026-10-31T10:00:00.000Z',
      amount: 25,
      allocations: [{ invoiceId: 'invoice-id', amount: 25 }],
    };

    await expect(
      new PaymentsService(prisma).record(dto, 'finance-id'),
    ).resolves.toBe(result);
    expect(tx.invoice.updateMany).toHaveBeenNthCalledWith(1, {
      where: {
        id: 'invoice-id',
        customerId: 'customer-id',
        status: 'CONFIRMED',
        amountDue: { gte: new Prisma.Decimal(25) },
      },
      data: {
        paidAmount: { increment: new Prisma.Decimal(25) },
        amountDue: { decrement: new Prisma.Decimal(25) },
      },
    });
    expect(tx.invoice.updateMany).toHaveBeenNthCalledWith(2, {
      where: {
        id: 'invoice-id',
        customerId: 'customer-id',
        status: 'CONFIRMED',
        amountDue: 0,
      },
      data: { status: 'PAID' },
    });
    expect(tx.paymentAllocation.create).toHaveBeenCalled();
    expect(tx.auditLog.create).toHaveBeenCalled();
  });

  it('rejects allocations exceeding payment amount before writing records', async () => {
    const transaction = jest.fn();
    const prisma = { $transaction: transaction } as unknown as PrismaService;
    const dto: RecordPaymentDto = {
      customerId: 'customer-id',
      paymentReference: 'PAY-2',
      paymentMethod: 'BANK_TRANSFER',
      receivedAt: '2026-10-31T10:00:00.000Z',
      amount: 10,
      allocations: [{ invoiceId: 'invoice-id', amount: 11 }],
    };

    await expect(
      new PaymentsService(prisma).record(dto, 'finance-id'),
    ).rejects.toThrow('allocations cannot exceed the payment amount');
    expect(transaction).not.toHaveBeenCalled();
  });

  it('reuses an existing pending Razorpay order for the same invoice', async () => {
    const previousKeyId = process.env.RAZORPAY_KEY_ID;
    const previousKeySecret = process.env.RAZORPAY_KEY_SECRET;
    process.env.RAZORPAY_KEY_ID = 'rzp_test_public';
    process.env.RAZORPAY_KEY_SECRET = 'test-secret';
    const pending = {
      orderId: 'order-existing',
      amountMinor: 12500,
      currency: 'INR',
    };
    const prisma = {
      invoice: {
        findFirst: resolved({
          id: 'invoice-id',
          invoiceNumber: 'BL-2026-001',
          amountDue: new Prisma.Decimal(125),
        }),
      },
      razorpayOrder: { findFirst: resolved(pending) },
    } as unknown as PrismaService;

    try {
      await expect(
        new PaymentsService(prisma).createRazorpayOrder(
          'invoice-id',
          'customer-id',
        ),
      ).resolves.toEqual({
        keyId: 'rzp_test_public',
        orderId: pending.orderId,
        amount: pending.amountMinor,
        currency: pending.currency,
        invoiceNumber: 'BL-2026-001',
      });
    } finally {
      if (previousKeyId === undefined) delete process.env.RAZORPAY_KEY_ID;
      else process.env.RAZORPAY_KEY_ID = previousKeyId;
      if (previousKeySecret === undefined)
        delete process.env.RAZORPAY_KEY_SECRET;
      else process.env.RAZORPAY_KEY_SECRET = previousKeySecret;
    }
  });
});
