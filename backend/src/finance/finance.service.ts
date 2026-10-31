import { Injectable } from '@nestjs/common';
import {
  InvoiceStatus,
  Prisma,
  SubscriptionStatus,
} from '../generated/prisma/client';
import { PrismaService } from '../database/prisma.service';

type ReceivableBucket = {
  label: string;
  start?: Date;
  end?: Date;
};

const DAY_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class FinanceService {
  constructor(private readonly prisma: PrismaService) {}

  async dashboard(asOf = new Date()) {
    const today = dateOnly(asOf);
    const monthStart = new Date(
      Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1),
    );
    const [activeSubscriptions, outstanding, overdue, paymentsThisMonth] =
      await Promise.all([
        this.prisma.subscription.count({
          where: { status: SubscriptionStatus.ACTIVE },
        }),
        this.prisma.invoice.aggregate({
          where: openInvoiceWhere(),
          _count: { _all: true },
          _sum: { amountDue: true },
        }),
        this.prisma.invoice.aggregate({
          where: { ...openInvoiceWhere(), dueDate: { lt: today } },
          _count: { _all: true },
          _sum: { amountDue: true },
        }),
        this.prisma.payment.aggregate({
          where: { receivedAt: { gte: monthStart }, status: 'POSTED' },
          _sum: { amount: true },
        }),
      ]);

    return {
      asOf: today,
      activeSubscriptions,
      outstandingInvoices: outstanding._count._all,
      outstandingAmount: decimalString(outstanding._sum.amountDue),
      overdueInvoices: overdue._count._all,
      overdueAmount: decimalString(overdue._sum.amountDue),
      paymentsReceivedThisMonth: decimalString(paymentsThisMonth._sum.amount),
    };
  }

  async receivablesAging(asOf = new Date()) {
    const today = dateOnly(asOf);
    const buckets: ReceivableBucket[] = [
      { label: 'current', start: today },
      {
        label: '1-30-days',
        start: addDays(today, -30),
        end: addDays(today, -1),
      },
      {
        label: '31-60-days',
        start: addDays(today, -60),
        end: addDays(today, -31),
      },
      {
        label: '61-90-days',
        start: addDays(today, -90),
        end: addDays(today, -61),
      },
      { label: 'over-90-days', end: addDays(today, -91) },
    ];

    const results = await Promise.all(
      buckets.map(async (bucket) => {
        const dueDate: Prisma.DateTimeFilter = {};
        if (bucket.start) dueDate.gte = bucket.start;
        if (bucket.end) dueDate.lte = bucket.end;
        const totals = await this.prisma.invoice.aggregate({
          where: { ...openInvoiceWhere(), dueDate },
          _count: { _all: true },
          _sum: { amountDue: true },
        });
        return {
          bucket: bucket.label,
          invoiceCount: totals._count._all,
          amount: decimalString(totals._sum.amountDue),
        };
      }),
    );

    return { asOf: today, buckets: results };
  }
}

function openInvoiceWhere(): Prisma.InvoiceWhereInput {
  return {
    status: InvoiceStatus.CONFIRMED,
    amountDue: { gt: 0 },
  };
}

function dateOnly(date: Date): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * DAY_MS);
}

function decimalString(value: Prisma.Decimal | null): string {
  return (value ?? new Prisma.Decimal(0)).toFixed(2);
}
