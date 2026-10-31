import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { SubscriptionStatus } from '../generated/prisma/client';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';

@Injectable()
export class SubscriptionsService {
  constructor(private readonly prisma: PrismaService) {}

  async createDraft(dto: CreateSubscriptionDto) {
    const [customer, plan] = await Promise.all([
      this.prisma.user.findFirst({ where: { id: dto.customerId, role: 'CUSTOMER', isActive: true } }),
      this.prisma.plan.findFirst({ where: { id: dto.planId, isActive: true } }),
    ]);
    if (!customer) throw new NotFoundException('active customer not found');
    if (!plan) throw new NotFoundException('active plan not found');
    if (dto.items.length === 0) throw new BadRequestException('at least one subscription item is required');

    const products = await this.prisma.product.findMany({ where: { id: { in: dto.items.map((item) => item.productId) }, isActive: true }, include: { variants: true } });
    if (products.length !== new Set(dto.items.map((item) => item.productId)).size) throw new BadRequestException('one or more products are unavailable');
    const resolvedItems = dto.items.map((item) => {
      const product = products.find((candidate) => candidate.id === item.productId)!;
      const variant = item.variantId ? product.variants.find((candidate) => candidate.id === item.variantId && candidate.isActive) : undefined;
      if (item.variantId && !variant) throw new BadRequestException('variant does not belong to its product or is inactive');
      const unitPrice = product.salesPrice.plus(variant?.priceExtra ?? 0);
      return { productId: product.id, variantId: variant?.id, productName: product.name, variantName: variant?.name, quantity: item.quantity, unitPrice, subtotal: unitPrice.mul(item.quantity) };
    });
    const subtotal = resolvedItems.reduce((total, item) => total.plus(item.subtotal), plan.price);
    const sequence = Date.now();
    return this.prisma.subscription.create({
      data: {
        subscriptionNumber: `SUB-${sequence}`,
        customerId: customer.id, planId: plan.id, startDate: new Date(dto.startDate), expiryDate: new Date(dto.expiryDate), nextBillingDate: new Date(dto.startDate), paymentTerms: dto.paymentTerms,
        subtotalAmount: subtotal, totalAmount: subtotal,
        items: { create: resolvedItems },
      }, include: { items: true, plan: true },
    });
  }

  list() { return this.prisma.subscription.findMany({ include: { customer: true, plan: true, items: true }, orderBy: { createdAt: 'desc' } }); }

  async transition(id: string, next: SubscriptionStatus) {
    const subscription = await this.prisma.subscription.findUnique({ where: { id } });
    if (!subscription) throw new NotFoundException('subscription not found');
    const allowed: Record<SubscriptionStatus, SubscriptionStatus[]> = { DRAFT: ['QUOTATION'], QUOTATION: ['CONFIRMED'], CONFIRMED: ['ACTIVE'], ACTIVE: ['CLOSED'], CLOSED: [] };
    if (!allowed[subscription.status].includes(next)) throw new BadRequestException(`cannot transition from ${subscription.status} to ${next}`);
    return this.prisma.subscription.update({ where: { id }, data: { status: next, quotationExpiresAt: next === 'QUOTATION' ? new Date(Date.now() + 30 * 86400000) : undefined } });
  }
}
