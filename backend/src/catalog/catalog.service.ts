import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreatePlanDto } from './dto/create-plan.dto';
import { CreateProductDto } from './dto/create-product.dto';
import { CreateVariantDto } from './dto/create-variant.dto';
import { CreateTaxRuleDto } from './dto/create-tax-rule.dto';
import { CreateDiscountRuleDto } from './dto/create-discount-rule.dto';

@Injectable()
export class CatalogService {
  constructor(private readonly prisma: PrismaService) {}

  createProduct(dto: CreateProductDto) {
    return this.prisma.product.create({ data: dto });
  }

  listProducts() {
    return this.prisma.product.findMany({ include: { variants: true }, orderBy: { name: 'asc' } });
  }

  async createVariant(productId: string, dto: CreateVariantDto) {
    const product = await this.prisma.product.findUnique({ where: { id: productId } });
    if (!product) throw new NotFoundException('product not found');
    return this.prisma.productVariant.create({ data: { ...dto, productId } });
  }

  createPlan(dto: CreatePlanDto) {
    return this.prisma.plan.create({
      data: { ...dto, startDate: new Date(dto.startDate), endDate: dto.endDate ? new Date(dto.endDate) : undefined },
    });
  }

  listPlans() {
    return this.prisma.plan.findMany({ orderBy: { name: 'asc' } });
  }

  createTaxRule(dto: CreateTaxRuleDto) {
    return this.prisma.taxRule.create({
      data: { ...dto, effectiveFrom: new Date(dto.effectiveFrom), effectiveUntil: dto.effectiveUntil ? new Date(dto.effectiveUntil) : undefined },
    });
  }

  listTaxRules() { return this.prisma.taxRule.findMany({ orderBy: { name: 'asc' } }); }

  createDiscountRule(dto: CreateDiscountRuleDto) {
    return this.prisma.discountRule.create({
      data: { ...dto, code: dto.code.trim().toUpperCase(), startDate: new Date(dto.startDate), endDate: new Date(dto.endDate) },
    });
  }

  listDiscountRules() { return this.prisma.discountRule.findMany({ orderBy: { code: 'asc' } }); }
}
