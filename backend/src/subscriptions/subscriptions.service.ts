import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../database/prisma.service';
import {
  DiscountType,
  Prisma,
  Role,
  SubscriptionStatus,
} from '../generated/prisma/client';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { CreateQuotationDto } from './dto/create-quotation.dto';
import { QuotationsService } from '../quotations/quotations.service';

@Injectable()
export class SubscriptionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly quotations: QuotationsService,
  ) {}

  async createDraft(
    dto: CreateSubscriptionDto,
    quotationValidityDays?: number,
    actorId?: string,
  ) {
    if (new Date(dto.expiryDate) <= new Date(dto.startDate)) {
      throw new BadRequestException('expiry date must be after start date');
    }
    const [customer, plan] = await Promise.all([
      this.prisma.user.findFirst({
        where: { id: dto.customerId, role: 'CUSTOMER', isActive: true },
      }),
      this.prisma.plan.findFirst({ where: { id: dto.planId, isActive: true } }),
    ]);
    if (!customer) throw new NotFoundException('active customer not found');
    if (!plan) throw new NotFoundException('active plan not found');
    const startDate = new Date(dto.startDate);
    if (
      plan.startDate > startDate ||
      (plan.endDate && plan.endDate < startDate)
    ) {
      throw new BadRequestException(
        'plan is not available on the subscription start date',
      );
    }
    if (dto.items.length === 0)
      throw new BadRequestException(
        'at least one subscription item is required',
      );
    if (
      dto.items.reduce((quantity, item) => quantity + item.quantity, 0) <
      plan.minQuantity
    ) {
      throw new BadRequestException(
        `subscription quantity must be at least ${plan.minQuantity}`,
      );
    }

    const taxRules = await this.prisma.taxRule.findMany({
      where: {
        isActive: true,
        effectiveFrom: { lte: startDate },
        OR: [{ effectiveUntil: null }, { effectiveUntil: { gte: startDate } }],
      },
    });
    const taxRate = taxRules.reduce(
      (total, rule) => total.plus(rule.ratePercentage),
      new Prisma.Decimal(0),
    );

    const products = await this.prisma.product.findMany({
      where: {
        id: { in: dto.items.map((item) => item.productId) },
        isActive: true,
      },
      include: { variants: true },
    });
    if (
      products.length !== new Set(dto.items.map((item) => item.productId)).size
    )
      throw new BadRequestException('one or more products are unavailable');
    const resolvedItems = dto.items.map((item) => {
      const product = products.find(
        (candidate) => candidate.id === item.productId,
      )!;
      const variant = item.variantId
        ? product.variants.find(
            (candidate) =>
              candidate.id === item.variantId && candidate.isActive,
          )
        : undefined;
      if (item.variantId && !variant)
        throw new BadRequestException(
          'variant does not belong to its product or is inactive',
        );
      const unitPrice = product.salesPrice.plus(variant?.priceExtra ?? 0);
      return {
        productId: product.id,
        variantId: variant?.id,
        productName: product.name,
        variantName: variant?.name,
        quantity: item.quantity,
        unitPrice,
        subtotal: unitPrice.mul(item.quantity),
        taxRate,
      };
    });
    const subtotal = resolvedItems.reduce(
      (total, item) => total.plus(item.subtotal),
      plan.price,
    );
    const quantity = dto.items.reduce(
      (total, item) => total + item.quantity,
      0,
    );
    const taxAmount = resolvedItems.reduce(
      (total, item) =>
        total.plus(item.subtotal.mul(item.taxRate).div(100).toDecimalPlaces(2)),
      plan.price.mul(taxRate).div(100).toDecimalPlaces(2),
    );
    const discountRule = dto.discountCode
      ? await this.prisma.discountRule.findFirst({
          where: {
            code: dto.discountCode.trim().toUpperCase(),
            isActive: true,
            startDate: { lte: startDate },
            endDate: { gte: startDate },
          },
        })
      : null;
    if (dto.discountCode && !discountRule) {
      throw new BadRequestException('discount code is unavailable');
    }
    if (
      discountRule &&
      (subtotal.lessThan(discountRule.minPurchaseAmount) ||
        quantity < discountRule.minQuantity ||
        (discountRule.maxUses !== null &&
          discountRule.currentUses >= discountRule.maxUses))
    ) {
      throw new BadRequestException(
        'discount code requirements are not met or its usage limit was reached',
      );
    }
    let discountAmount = new Prisma.Decimal(0);
    if (discountRule) {
      discountAmount =
        discountRule.discountType === DiscountType.PERCENTAGE
          ? subtotal.mul(discountRule.value).div(100).toDecimalPlaces(2)
          : new Prisma.Decimal(discountRule.value).toDecimalPlaces(2);
      discountAmount = Prisma.Decimal.min(discountAmount, subtotal);
    }
    const total = subtotal.plus(taxAmount).minus(discountAmount);

    return this.prisma.$transaction(async (tx) => {
      if (discountRule) {
        const usage = await tx.discountRule.updateMany({
          where: {
            id: discountRule.id,
            currentUses: discountRule.currentUses,
            isActive: true,
            startDate: { lte: startDate },
            endDate: { gte: startDate },
          },
          data: { currentUses: { increment: 1 } },
        });
        if (usage.count !== 1) {
          throw new BadRequestException(
            'discount code usage changed; reload and retry',
          );
        }
      }

      const subscription = await tx.subscription.create({
        data: {
          subscriptionNumber: `SUB-${randomUUID().toUpperCase()}`,
          status: quotationValidityDays
            ? SubscriptionStatus.QUOTATION
            : SubscriptionStatus.DRAFT,
          quotationExpiresAt: quotationValidityDays
            ? new Date(Date.now() + quotationValidityDays * 86400000)
            : undefined,
          customerId: customer.id,
          planId: plan.id,
          startDate: new Date(dto.startDate),
          expiryDate: new Date(dto.expiryDate),
          nextBillingDate: new Date(dto.startDate),
          paymentTerms: dto.paymentTerms,
          subtotalAmount: subtotal,
          taxAmount,
          discountAmount,
          totalAmount: total,
          items: { create: resolvedItems },
        },
        include: { items: true, plan: true },
      });
      if (actorId) {
        await tx.auditLog.create({
          data: {
            actorId,
            action: quotationValidityDays
              ? 'SUBSCRIPTION_QUOTATION_CREATED'
              : 'SUBSCRIPTION_DRAFT_CREATED',
            entityType: 'SUBSCRIPTION',
            entityId: subscription.id,
            afterData: {
              status: subscription.status,
              customerId: customer.id,
              planId: plan.id,
              discountCode: discountRule?.code ?? null,
            },
          },
        });
      }
      return subscription;
    });
  }

  async createQuotation(dto: CreateQuotationDto, actorId: string) {
    const template = await this.quotations.findActiveTemplate(dto.templateId);
    return this.createDraft(
      {
        customerId: dto.customerId,
        planId: template.planId,
        startDate: dto.startDate,
        expiryDate: dto.expiryDate,
        paymentTerms: dto.paymentTerms,
        discountCode: dto.discountCode,
        items: template.items.map((item) => ({
          productId: item.productId,
          variantId: item.variantId ?? undefined,
          quantity: item.quantity,
        })),
      },
      template.validityDays,
      actorId,
    );
  }

  list(user: { id: string; role: Role }) {
    return this.prisma.subscription.findMany({
      where: user.role === Role.CUSTOMER ? { customerId: user.id } : undefined,
      include: {
        customer: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
        plan: true,
        items: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async get(id: string, user: { id: string; role: Role }) {
    const subscription = await this.prisma.subscription.findFirst({
      where: {
        id,
        ...(user.role === Role.CUSTOMER ? { customerId: user.id } : {}),
      },
      include: {
        customer: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
        plan: true,
        items: true,
      },
    });
    if (!subscription) throw new NotFoundException('subscription not found');
    return subscription;
  }

  async transition(id: string, next: SubscriptionStatus, actorId: string) {
    return this.prisma.$transaction(async (tx) => {
      const subscription = await tx.subscription.findUnique({ where: { id } });
      if (!subscription) throw new NotFoundException('subscription not found');
      const allowed: Record<SubscriptionStatus, SubscriptionStatus[]> = {
        DRAFT: ['QUOTATION'],
        QUOTATION: ['CONFIRMED'],
        CONFIRMED: ['ACTIVE'],
        ACTIVE: ['CLOSED'],
        CLOSED: [],
      };
      if (!allowed[subscription.status].includes(next)) {
        throw new BadRequestException(
          `cannot transition from ${subscription.status} to ${next}`,
        );
      }
      if (
        subscription.status === SubscriptionStatus.QUOTATION &&
        subscription.quotationExpiresAt &&
        subscription.quotationExpiresAt < new Date()
      ) {
        throw new BadRequestException('quotation has expired');
      }

      const updated = await tx.subscription.updateMany({
        where: { id, status: subscription.status },
        data: {
          status: next,
          quotationExpiresAt:
            next === SubscriptionStatus.QUOTATION
              ? new Date(Date.now() + 30 * 86400000)
              : undefined,
        },
      });
      if (updated.count !== 1) {
        throw new BadRequestException(
          'subscription status changed; reload and retry',
        );
      }
      await tx.auditLog.create({
        data: {
          actorId,
          action: `SUBSCRIPTION_${next}`,
          entityType: 'SUBSCRIPTION',
          entityId: id,
          beforeData: { status: subscription.status },
          afterData: { status: next },
        },
      });
      return tx.subscription.findUniqueOrThrow({
        where: { id },
        include: { items: true, plan: true },
      });
    });
  }
}
