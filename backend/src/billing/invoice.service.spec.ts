import { describe, expect, it, jest } from '@jest/globals';

class MockHttpException extends Error {}

jest.mock('@nestjs/common', () => ({
  Injectable: () => (target: unknown) => target,
  BadRequestException: MockHttpException,
  NotFoundException: MockHttpException,
  ServiceUnavailableException: MockHttpException,
}));
jest.mock('./invoice-mailer.service', () => ({
  InvoiceMailer: class {},
}));

import { InvoiceStatus, Prisma } from '../generated/prisma/client';
import { PrismaService } from '../database/prisma.service';
import { InvoiceService } from './invoice.service';

describe('InvoiceService', () => {
  it('confirms a draft invoice atomically and records an audit event', async () => {
    const current = {
      id: 'invoice-1',
      status: InvoiceStatus.DRAFT,
      paidAmount: new Prisma.Decimal(0),
    };
    const confirmed = { ...current, status: InvoiceStatus.CONFIRMED };
    const tx = {
      invoice: {
        findUnique: jest
          .fn<() => Promise<typeof current | null>>()
          .mockResolvedValue(current),
        updateMany: jest
          .fn<() => Promise<{ count: number }>>()
          .mockResolvedValue({ count: 1 }),
        findUniqueOrThrow: jest
          .fn<() => Promise<typeof confirmed>>()
          .mockResolvedValue(confirmed),
      },
      auditLog: {
        create: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
      },
    };
    const prisma = {
      $transaction: jest.fn(
        <T>(callback: (transaction: typeof tx) => Promise<T>) => callback(tx),
      ),
    } as unknown as PrismaService;

    await expect(
      new InvoiceService(prisma).transition(
        'invoice-1',
        InvoiceStatus.CONFIRMED,
        'finance-user',
      ),
    ).resolves.toBe(confirmed);
    expect(tx.invoice.updateMany).toHaveBeenCalledWith({
      where: {
        id: 'invoice-1',
        status: InvoiceStatus.DRAFT,
        paidAmount: 0,
      },
      data: { status: InvoiceStatus.CONFIRMED },
    });
    expect(tx.auditLog.create).toHaveBeenCalledWith({
      data: {
        actorId: 'finance-user',
        action: 'INVOICE_CONFIRMED',
        entityType: 'INVOICE',
        entityId: 'invoice-1',
        beforeData: { status: InvoiceStatus.DRAFT },
        afterData: { status: InvoiceStatus.CONFIRMED },
      },
    });
  });

  it('rejects cancelling an invoice with a payment balance', async () => {
    const findUnique = jest
      .fn<
        () => Promise<{
          id: string;
          status: typeof InvoiceStatus.DRAFT;
          paidAmount: Prisma.Decimal;
        }>
      >()
      .mockResolvedValue({
        id: 'invoice-1',
        status: InvoiceStatus.DRAFT,
        paidAmount: new Prisma.Decimal(10),
      });
    const tx = {
      invoice: {
        findUnique,
        updateMany: jest.fn(),
      },
      auditLog: { create: jest.fn() },
    };
    const prisma = {
      $transaction: jest.fn(
        <T>(callback: (transaction: typeof tx) => Promise<T>) => callback(tx),
      ),
    } as unknown as PrismaService;

    await expect(
      new InvoiceService(prisma).transition(
        'invoice-1',
        InvoiceStatus.CANCELLED,
        'finance-user',
      ),
    ).rejects.toThrow('an invoice with payments cannot be cancelled');
    expect(tx.invoice.updateMany).not.toHaveBeenCalled();
    expect(tx.auditLog.create).not.toHaveBeenCalled();
  });
});
