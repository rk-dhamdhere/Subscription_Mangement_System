import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
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
    return this.prisma.product.findMany({
      include: { variants: true },
      orderBy: { name: 'asc' },
    });
  }

  async createVariant(productId: string, dto: CreateVariantDto) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });
    if (!product) throw new NotFoundException('product not found');
    return this.prisma.productVariant.create({ data: { ...dto, productId } });
  }

  createPlan(dto: CreatePlanDto) {
    if (dto.endDate && new Date(dto.endDate) < new Date(dto.startDate)) {
      throw new BadRequestException(
        'plan end date must be on or after start date',
      );
    }
    return this.prisma.plan.create({
      data: {
        ...dto,
        startDate: new Date(dto.startDate),
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
      },
    });
  }

  listPlans() {
    return this.prisma.plan.findMany({ orderBy: { name: 'asc' } });
  }

  createTaxRule(dto: CreateTaxRuleDto) {
    if (
      dto.effectiveUntil &&
      new Date(dto.effectiveUntil) < new Date(dto.effectiveFrom)
    ) {
      throw new BadRequestException(
        'tax rule end date must be on or after its effective date',
      );
    }
    return this.prisma.taxRule.create({
      data: {
        ...dto,
        effectiveFrom: new Date(dto.effectiveFrom),
        effectiveUntil: dto.effectiveUntil
          ? new Date(dto.effectiveUntil)
          : undefined,
      },
    });
  }

  listTaxRules() {
    return this.prisma.taxRule.findMany({ orderBy: { name: 'asc' } });
  }

  createDiscountRule(dto: CreateDiscountRuleDto) {
    if (new Date(dto.endDate) < new Date(dto.startDate)) {
      throw new BadRequestException(
        'discount rule end date must be on or after its start date',
      );
    }
    if (dto.discountType === 'PERCENTAGE' && dto.value > 100) {
      throw new BadRequestException('percentage discount cannot exceed 100');
    }
    return this.prisma.discountRule.create({
      data: {
        ...dto,
        code: dto.code.trim().toUpperCase(),
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate),
      },
    });
  }

  listDiscountRules() {
    return this.prisma.discountRule.findMany({ orderBy: { code: 'asc' } });
  }
}
