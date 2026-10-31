import { describe, expect, it, jest } from '@jest/globals';

jest.mock('@nestjs/common', () => ({
  Injectable: () => (target: unknown) => target,
  BadRequestException: class extends Error {},
  NotFoundException: class extends Error {},
}));

import { Prisma, Role, SubscriptionStatus } from '../generated/prisma/client';
import { PrismaService } from '../database/prisma.service';
import { QuotationsService } from '../quotations/quotations.service';
import { SubscriptionsService } from './subscriptions.service';

describe('SubscriptionsService', () => {
  const resolved = <T>(value: T) =>
    jest.fn<() => Promise<T>>().mockResolvedValue(value);

  it('applies effective tax rules and atomically redeems a discount', async () => {
    const customer = { id: 'customer-id' };
    const plan = {
      id: 'plan-id',
      price: new Prisma.Decimal(100),
      minQuantity: 1,
      startDate: new Date('2026-01-01T00:00:00.000Z'),
      endDate: null,
    };
    const product = {
      id: 'product-id',
      name: 'Workspace',
      salesPrice: new Prisma.Decimal(50),
      variants: [],
    };
    const taxRule = { ratePercentage: new Prisma.Decimal(10) };
    const discountRule = {
      id: 'discount-id',
      discountType: 'PERCENTAGE',
      value: new Prisma.Decimal(10),
      minPurchaseAmount: new Prisma.Decimal(100),
      minQuantity: 1,
      maxUses: 10,
      currentUses: 2,
    };
    const create = jest
      .fn<
        (input: {
          data: Prisma.SubscriptionCreateInput;
        }) => Promise<{ id: string }>
      >()
      .mockResolvedValue({ id: 'subscription-id' });
    const tx = {
      discountRule: { updateMany: resolved({ count: 1 }) },
      subscription: { create },
      auditLog: { create: resolved({ id: 'audit-id' }) },
    };
    const prisma = {
      user: { findFirst: resolved(customer) },
      plan: { findFirst: resolved(plan) },
      product: { findMany: resolved([product]) },
      taxRule: { findMany: resolved([taxRule]) },
      discountRule: { findFirst: resolved(discountRule) },
      $transaction: jest.fn(
        <T>(callback: (transaction: typeof tx) => Promise<T>) => callback(tx),
      ),
    } as unknown as PrismaService;
    const quotations = {} as QuotationsService;

    await new SubscriptionsService(prisma, quotations).createDraft(
      {
        customerId: 'customer-id',
        planId: 'plan-id',
        startDate: '2026-10-31',
        expiryDate: '2027-10-31',
        paymentTerms: 'NET_30',
        discountCode: 'SAVE10',
        items: [{ productId: 'product-id', quantity: 1 }],
      },
      undefined,
      'staff-id',
    );

    const createInput = create.mock.calls[0][0].data;
    expect(createInput.subtotalAmount).toEqual(new Prisma.Decimal(150));
    expect(createInput.taxAmount).toEqual(new Prisma.Decimal(15));
    expect(createInput.discountAmount).toEqual(new Prisma.Decimal(15));
    expect(createInput.totalAmount).toEqual(new Prisma.Decimal(150));
    expect(createInput.items).toMatchObject({
      create: [
        {
          productId: 'product-id',
          taxRate: new Prisma.Decimal(10),
          subtotal: new Prisma.Decimal(50),
        },
      ],
    });
    expect(tx.discountRule.updateMany).toHaveBeenCalledWith({
      where: expect.objectContaining({
        id: 'discount-id',
        currentUses: 2,
        isActive: true,
      }),
      data: { currentUses: { increment: 1 } },
    });
    expect(tx.auditLog.create).toHaveBeenCalled();
  });

  it('restricts customer pause, resume, and early-close actions to owned subscriptions and plan policy', async () => {
    const subscription = {
      id: 'subscription-id',
      customerId: 'customer-id',
      status: SubscriptionStatus.ACTIVE,
      plan: { canPause: false, canCloseEarly: true },
    };
    const tx = {
      subscription: {
        findFirst: resolved(subscription),
        updateMany: jest.fn(),
      },
    };
    const prisma = {
      $transaction: jest.fn(
        <T>(callback: (transaction: typeof tx) => Promise<T>) => callback(tx),
      ),
    } as unknown as PrismaService;

    await expect(
      new SubscriptionsService(prisma, {} as QuotationsService).transition(
        subscription.id,
        SubscriptionStatus.PAUSED,
        { id: 'customer-id', role: Role.CUSTOMER },
      ),
    ).rejects.toThrow('this plan does not allow pausing');
    expect(tx.subscription.findFirst).toHaveBeenCalledWith({
      where: { id: subscription.id, customerId: 'customer-id' },
      include: { plan: true },
    });
    expect(tx.subscription.updateMany).not.toHaveBeenCalled();
  });

  it('creates an audited renewal draft using the previous price and item snapshots', async () => {
    const current = {
      id: 'closed-subscription',
      customerId: 'customer-id',
      planId: 'plan-id',
      status: SubscriptionStatus.CLOSED,
      startDate: new Date('2025-01-01T00:00:00.000Z'),
      expiryDate: new Date('2026-01-01T00:00:00.000Z'),
      paymentTerms: 'NET_30',
      subtotalAmount: new Prisma.Decimal(150),
      taxAmount: new Prisma.Decimal(15),
      discountAmount: new Prisma.Decimal(0),
      totalAmount: new Prisma.Decimal(165),
      plan: {
        id: 'plan-id',
        canRenew: true,
        isActive: true,
        startDate: new Date('2025-01-01T00:00:00.000Z'),
        endDate: null,
      },
      items: [{
        productId: 'product-id',
        variantId: null,
        productName: 'Workspace',
        variantName: null,
        quantity: 1,
        unitPrice: new Prisma.Decimal(50),
        taxRate: new Prisma.Decimal(10),
        subtotal: new Prisma.Decimal(50),
      }],
    };
    const created = { id: 'renewal-id', status: SubscriptionStatus.DRAFT };
    const tx = {
      subscription: {
        findFirst: resolved(current),
        create: jest.fn<() => Promise<typeof created>>().mockResolvedValue(created),
      },
      auditLog: { create: resolved({ id: 'audit-id' }) },
    };
    const prisma = {
      $transaction: jest.fn(
        <T>(callback: (transaction: typeof tx) => Promise<T>) => callback(tx),
      ),
    } as unknown as PrismaService;

    await expect(
      new SubscriptionsService(prisma, {} as QuotationsService).renew(
        current.id,
        { id: 'customer-id', role: Role.CUSTOMER },
      ),
    ).resolves.toBe(created);
    expect(tx.subscription.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        customerId: 'customer-id',
        planId: 'plan-id',
        status: SubscriptionStatus.DRAFT,
        subtotalAmount: current.subtotalAmount,
        taxAmount: current.taxAmount,
        totalAmount: current.totalAmount,
        items: {
          create: [expect.objectContaining({
            productName: 'Workspace',
            unitPrice: new Prisma.Decimal(50),
            taxRate: new Prisma.Decimal(10),
          })],
        },
      }),
      include: { items: true, plan: true },
    });
    expect(tx.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: 'SUBSCRIPTION_RENEWAL_DRAFT_CREATED',
          entityId: 'renewal-id',
        }),
      }),
    );
  });
});
