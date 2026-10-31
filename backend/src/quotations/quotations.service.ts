import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../database/prisma.service';
import { CreateQuotationTemplateDto } from './dto/create-quotation-template.dto';

const templateInclude = {
  plan: true,
  items: {
    include: { product: true, variant: true },
  },
} satisfies Prisma.QuotationTemplateInclude;

@Injectable()
export class QuotationsService {
  constructor(private readonly prisma: PrismaService) {}

  listTemplates() {
    return this.prisma.quotationTemplate.findMany({
      where: { isActive: true },
      include: templateInclude,
      orderBy: { name: 'asc' },
    });
  }

  async createTemplate(dto: CreateQuotationTemplateDto) {
    const plan = await this.prisma.plan.findFirst({
      where: { id: dto.planId, isActive: true },
      select: { id: true },
    });
    if (!plan) throw new NotFoundException('active plan not found');

    const productIds = [...new Set(dto.items.map((item) => item.productId))];
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds }, isActive: true },
      include: { variants: true },
    });
    if (products.length !== productIds.length) {
      throw new NotFoundException('one or more active products were not found');
    }

    for (const item of dto.items) {
      const product = products.find(
        (candidate) => candidate.id === item.productId,
      );
      if (
        item.variantId &&
        !product?.variants.some(
          (variant) => variant.id === item.variantId && variant.isActive,
        )
      ) {
        throw new BadRequestException(
          'variant does not belong to its product or is inactive',
        );
      }
    }

    return this.prisma.quotationTemplate.create({
      data: {
        name: dto.name.trim(),
        planId: plan.id,
        validityDays: dto.validityDays,
        items: {
          create: dto.items.map((item) => ({
            productId: item.productId,
            variantId: item.variantId,
            quantity: item.quantity,
          })),
        },
      },
      include: templateInclude,
    });
  }

  async findActiveTemplate(id: string) {
    const template = await this.prisma.quotationTemplate.findFirst({
      where: { id, isActive: true },
      include: templateInclude,
    });
    if (!template)
      throw new NotFoundException('active quotation template not found');
    return template;
  }
}
