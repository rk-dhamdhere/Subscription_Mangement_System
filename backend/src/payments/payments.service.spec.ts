import { describe, expect, it, jest } from '@jest/globals';

class MockHttpException extends Error {}

jest.mock('@nestjs/common', () => ({
  Injectable: () => (target: unknown) => target,
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
});
