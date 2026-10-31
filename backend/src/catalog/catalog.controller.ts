import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { Role } from '../generated/prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';
import { CatalogService } from './catalog.service';
import { CreatePlanDto } from './dto/create-plan.dto';
import { CreateProductDto } from './dto/create-product.dto';
import { CreateVariantDto } from './dto/create-variant.dto';
import { CreateTaxRuleDto } from './dto/create-tax-rule.dto';
import { CreateDiscountRuleDto } from './dto/create-discount-rule.dto';

@Controller('catalog')
export class CatalogController {
  constructor(private readonly catalog: CatalogService) {}

  @Get('products')
  @Roles(Role.ADMIN)
  listProducts() { return this.catalog.listProducts(); }

  @Post('products')
  @Roles(Role.ADMIN)
  createProduct(@Body() dto: CreateProductDto) { return this.catalog.createProduct(dto); }

  @Post('products/:productId/variants')
  @Roles(Role.ADMIN)
  createVariant(@Param('productId') productId: string, @Body() dto: CreateVariantDto) {
    return this.catalog.createVariant(productId, dto);
  }

  @Get('plans')
  @Roles(Role.ADMIN)
  listPlans() { return this.catalog.listPlans(); }

  @Post('plans')
  @Roles(Role.ADMIN)
  createPlan(@Body() dto: CreatePlanDto) { return this.catalog.createPlan(dto); }

  @Get('tax-rules')
  @Roles(Role.ADMIN)
  listTaxRules() { return this.catalog.listTaxRules(); }

  @Post('tax-rules')
  @Roles(Role.ADMIN)
  createTaxRule(@Body() dto: CreateTaxRuleDto) { return this.catalog.createTaxRule(dto); }

  @Get('discount-rules')
  @Roles(Role.ADMIN)
  listDiscountRules() { return this.catalog.listDiscountRules(); }

  @Post('discount-rules')
  @Roles(Role.ADMIN)
  createDiscountRule(@Body() dto: CreateDiscountRuleDto) { return this.catalog.createDiscountRule(dto); }
}
