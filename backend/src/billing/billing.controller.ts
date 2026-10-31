import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { FinanceAdminGuard } from './finance-admin.guard';
import { RunBillingDto } from './dto/run-billing.dto';
import { BillingService } from './billing.service';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

@Controller('billing-runs')
@ApiTags('Billing')
@ApiBearerAuth()
@UseGuards(FinanceAdminGuard)
export class BillingController {
  constructor(private readonly billing: BillingService) {}

  @Get()
  list() {
    return this.billing.list();
  }

  @Post()
  run(
    @Body() dto: RunBillingDto,
    @Req() request: Request & { user: { id: string } },
  ) {
    return this.billing.run(new Date(dto.billingDate), request.user.id);
  }
}
