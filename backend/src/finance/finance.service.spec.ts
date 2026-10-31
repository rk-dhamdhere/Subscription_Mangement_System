import { describe, expect, it, jest } from '@jest/globals';

jest.mock('@nestjs/common', () => ({
  Injectable: () => (target: unknown) => target,
}));

import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../database/prisma.service';
import { FinanceService } from './finance.service';

describe('FinanceService', () => {
  it('returns outstanding, overdue, and month-to-date dashboard amounts', async () => {
    const prisma = {
      subscription: {
        count: jest.fn<() => Promise<number>>().mockResolvedValue(4),
      },
      invoice: {
        aggregate: jest
          .fn<
            () => Promise<{
              _count: { _all: number };
              _sum: { amountDue: Prisma.Decimal };
            }>
          >()
          .mockResolvedValueOnce({
            _count: { _all: 3 },
            _sum: { amountDue: new Prisma.Decimal(125.5) },
          })
          .mockResolvedValueOnce({
            _count: { _all: 2 },
            _sum: { amountDue: new Prisma.Decimal(80) },
          }),
      },
      payment: {
        aggregate: jest
          .fn<() => Promise<{ _sum: { amount: Prisma.Decimal } }>>()
          .mockResolvedValue({
            _sum: { amount: new Prisma.Decimal(50) },
          }),
      },
    } as unknown as PrismaService;

    await expect(
      new FinanceService(prisma).dashboard(
        new Date('2026-10-31T12:00:00.000Z'),
      ),
    ).resolves.toEqual({
      asOf: new Date('2026-10-31T00:00:00.000Z'),
      activeSubscriptions: 4,
      outstandingInvoices: 3,
      outstandingAmount: '125.50',
      overdueInvoices: 2,
      overdueAmount: '80.00',
      paymentsReceivedThisMonth: '50.00',
    });
  });
});
