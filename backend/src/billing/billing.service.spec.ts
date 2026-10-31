import { describe, expect, it, jest } from '@jest/globals';
jest.mock('@nestjs/common', () => ({
  Injectable: () => (target: unknown) => target,
}));

import {
  BillingPeriod,
  Prisma,
  SubscriptionStatus,
} from '../generated/prisma/client';
import { PrismaService } from '../database/prisma.service';
import { BillingService } from './billing.service';

describe('BillingService', () => {
  const date = (value: string) => new Date(`${value}T00:00:00.000Z`);
  const resolved = <T>(value: T) =>
    jest.fn<() => Promise<T>>().mockResolvedValue(value);

  it('creates a draft invoice and advances a monthly cycle in one transaction', async () => {
    const subscription = {
      id: 'subscription-1',
      customerId: 'customer-1',
      paymentTerms: 'NET_30',
      status: SubscriptionStatus.ACTIVE,
      nextBillingDate: date('2026-01-31'),
      subtotalAmount: new Prisma.Decimal(120),
      plan: { billingPeriod: BillingPeriod.MONTHLY },
      items: [
        {
          id: 'item-1',
          productName: 'Product',
          variantName: null,
          quantity: 1,
          unitPrice: new Prisma.Decimal(20),
          taxRate: new Prisma.Decimal(5),
          subtotal: new Prisma.Decimal(20),
        },
      ],
    };
    const tx = {
      billingRun: {
        create: resolved({ id: 'run-1' }),
        update: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
        findUniqueOrThrow: resolved({ id: 'run-1' }),
      },
      subscription: {
        findMany: resolved([subscription]),
        updateMany: resolved({ count: 1 }),
      },
      invoice: {
        create: jest
          .fn<(input: { data: Prisma.InvoiceCreateInput }) => Promise<void>>()
          .mockResolvedValue(undefined),
      },
      billingRunItem: { create: jest.fn() },
    };
    const prisma = {
      billingRun: { findUnique: resolved(null) },
      $transaction: jest.fn<
        (
          callback: (transaction: typeof tx) => Promise<unknown>,
        ) => Promise<unknown>
      >((callback) => callback(tx)),
    } as unknown as PrismaService;

    await new BillingService(prisma).run(date('2026-02-01'), 'finance-user');

    expect(tx.subscription.updateMany).toHaveBeenCalledWith({
      where: {
        id: 'subscription-1',
        status: SubscriptionStatus.ACTIVE,
        nextBillingDate: date('2026-01-31'),
      },
      data: { nextBillingDate: date('2026-02-28') },
    });
    const invoice = tx.invoice.create.mock.calls[0][0].data;
    expect(invoice.billingCycleDate).toEqual(date('2026-01-31'));
    expect(invoice.issueDate).toEqual(date('2026-02-01'));
    expect(invoice.dueDate).toEqual(date('2026-03-03'));
    expect(invoice.subtotalAmount).toEqual(new Prisma.Decimal(120));
    expect(invoice.taxAmount).toEqual(new Prisma.Decimal(1));
    expect(invoice.totalAmount).toEqual(new Prisma.Decimal(121));
    expect(tx.billingRunItem.create).toHaveBeenCalledWith({
      data: {
        billingRunId: 'run-1',
        subscriptionId: 'subscription-1',
        outcome: 'INVOICED',
      },
    });
  });

  it('returns an existing run without invoicing again for the same billing date', async () => {
    const existingRun = { id: 'existing-run' };
    const prisma = {
      billingRun: { findUnique: resolved(existingRun) },
      $transaction: jest.fn(),
    } as unknown as PrismaService;

    await expect(
      new BillingService(prisma).run(date('2026-02-01'), 'finance-user'),
    ).resolves.toBe(existingRun);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});
