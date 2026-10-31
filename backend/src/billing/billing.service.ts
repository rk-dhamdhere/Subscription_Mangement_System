import { BadRequestException, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import {
  BillingOutcome,
  BillingPeriod,
  BillingRunStatus,
  InvoiceItemType,
  Prisma,
  SubscriptionStatus,
} from '../generated/prisma/client';
import { PrismaService } from '../database/prisma.service';

const invoiceRunInclude = {
  items: { include: { subscription: true } },
  invoices: { include: { items: true } },
} satisfies Prisma.BillingRunInclude;

@Injectable()
export class BillingService {
  constructor(private readonly prisma: PrismaService) {}

  list() {
    return this.prisma.billingRun.findMany({
      include: invoiceRunInclude,
      orderBy: { billingDate: 'desc' },
    });
  }

  async run(billingDate: Date, initiatedById: string) {
    const runDate = dateOnly(billingDate);
    const existing = await this.prisma.billingRun.findUnique({
      where: { billingDate: runDate },
      include: invoiceRunInclude,
    });
    if (existing) return existing;

    try {
      return await this.prisma.$transaction(async (tx) => {
        const run = await tx.billingRun.create({
          data: {
            billingDate: runDate,
            status: BillingRunStatus.RUNNING,
            startedAt: new Date(),
            initiatedById,
          },
        });
        const candidates = await tx.subscription.findMany({
          where: {
            status: SubscriptionStatus.ACTIVE,
            nextBillingDate: { lte: runDate },
          },
          include: { plan: true, items: true },
          orderBy: [{ nextBillingDate: 'asc' }, { id: 'asc' }],
        });
        let invoicedCount = 0;
        let skippedCount = 0;

        for (const subscription of candidates) {
          const cycleDate = dateOnly(subscription.nextBillingDate);
          const nextBillingDate = advanceBillingDate(
            cycleDate,
            subscription.plan.billingPeriod,
          );
          const advanced = await tx.subscription.updateMany({
            where: {
              id: subscription.id,
              status: SubscriptionStatus.ACTIVE,
              nextBillingDate: cycleDate,
            },
            data: { nextBillingDate },
          });

          if (advanced.count === 0) {
            await tx.billingRunItem.create({
              data: {
                billingRunId: run.id,
                subscriptionId: subscription.id,
                outcome: BillingOutcome.SKIPPED,
                message:
                  'Subscription billing date changed while this run was processing.',
              },
            });
            skippedCount += 1;
            continue;
          }

          const invoice = buildInvoice(
            subscription,
            run.id,
            runDate,
            cycleDate,
          );
          await tx.invoice.create({ data: invoice });
          await tx.billingRunItem.create({
            data: {
              billingRunId: run.id,
              subscriptionId: subscription.id,
              outcome: BillingOutcome.INVOICED,
            },
          });
          invoicedCount += 1;
        }

        await tx.billingRun.update({
          where: { id: run.id },
          data: {
            status: BillingRunStatus.COMPLETED,
            candidateCount: candidates.length,
            invoicedCount,
            skippedCount,
            finishedAt: new Date(),
          },
        });

        return tx.billingRun.findUniqueOrThrow({
          where: { id: run.id },
          include: invoiceRunInclude,
        });
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        const completedRun = await this.prisma.billingRun.findUnique({
          where: { billingDate: runDate },
          include: invoiceRunInclude,
        });
        if (completedRun) return completedRun;
      }
      throw error;
    }
  }
}

function buildInvoice(
  subscription: {
    id: string;
    customerId: string;
    paymentTerms: string;
    subtotalAmount: Prisma.Decimal;
    items: Array<{
      id: string;
      productName: string;
      variantName: string | null;
      quantity: number;
      unitPrice: Prisma.Decimal;
      taxRate: Prisma.Decimal;
      subtotal: Prisma.Decimal;
    }>;
  },
  billingRunId: string,
  issueDate: Date,
  cycleDate: Date,
): Prisma.InvoiceCreateInput {
  const itemsSubtotal = subscription.items.reduce(
    (total, item) => total.plus(item.subtotal),
    new Prisma.Decimal(0),
  );
  const planFee = subscription.subtotalAmount.minus(itemsSubtotal);
  const invoiceItems: Prisma.InvoiceItemCreateWithoutInvoiceInput[] = [
    {
      itemType: InvoiceItemType.PLAN_FEE,
      description: 'Subscription plan fee',
      quantity: 1,
      unitPrice: planFee,
      preTaxAmount: planFee,
      taxRate: 0,
      taxAmount: 0,
      totalAmount: planFee,
    },
    ...subscription.items.map((item) => {
      const taxAmount = item.subtotal
        .mul(item.taxRate)
        .div(100)
        .toDecimalPlaces(2);
      return {
        subscriptionItem: { connect: { id: item.id } },
        itemType: InvoiceItemType.PRODUCT,
        description: item.variantName
          ? `${item.productName} - ${item.variantName}`
          : item.productName,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        preTaxAmount: item.subtotal,
        taxRate: item.taxRate,
        taxAmount,
        totalAmount: item.subtotal.plus(taxAmount),
      };
    }),
  ];
  const subtotalAmount = subscription.subtotalAmount;
  const taxAmount = subscription.items.reduce(
    (total, item) =>
      total.plus(item.subtotal.mul(item.taxRate).div(100).toDecimalPlaces(2)),
    new Prisma.Decimal(0),
  );
  const totalAmount = subtotalAmount.plus(taxAmount);

  return {
    invoiceNumber: `INV-${issueDate.toISOString().slice(0, 10).replace(/-/g, '')}-${randomUUID().slice(0, 8).toUpperCase()}`,
    billingRun: { connect: { id: billingRunId } },
    subscription: { connect: { id: subscription.id } },
    customer: { connect: { id: subscription.customerId } },
    billingCycleDate: cycleDate,
    issueDate,
    dueDate: paymentTermsDueDate(issueDate, subscription.paymentTerms),
    subtotalAmount,
    taxAmount,
    discountAmount: 0,
    totalAmount,
    paidAmount: 0,
    amountDue: totalAmount,
    items: { create: invoiceItems },
  };
}

function dateOnly(date: Date): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
}

function addDays(date: Date, days: number): Date {
  const result = dateOnly(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

function paymentTermsDueDate(issueDate: Date, paymentTerms: string): Date {
  if (paymentTerms === 'DUE_ON_RECEIPT') return issueDate;
  const match = /^NET_(\d+)$/.exec(paymentTerms);
  const days = match ? Number(match[1]) : Number.NaN;
  if (!Number.isSafeInteger(days)) {
    throw new BadRequestException(`unsupported payment terms: ${paymentTerms}`);
  }
  return addDays(issueDate, days);
}

function advanceBillingDate(date: Date, period: BillingPeriod): Date {
  const result = dateOnly(date);
  if (period === BillingPeriod.DAILY)
    result.setUTCDate(result.getUTCDate() + 1);
  if (period === BillingPeriod.WEEKLY)
    result.setUTCDate(result.getUTCDate() + 7);
  if (period === BillingPeriod.MONTHLY || period === BillingPeriod.YEARLY) {
    const day = result.getUTCDate();
    const months = period === BillingPeriod.MONTHLY ? 1 : 12;
    result.setUTCDate(1);
    result.setUTCMonth(result.getUTCMonth() + months);
    const lastDay = new Date(
      Date.UTC(result.getUTCFullYear(), result.getUTCMonth() + 1, 0),
    ).getUTCDate();
    result.setUTCDate(Math.min(day, lastDay));
  }
  return result;
}
