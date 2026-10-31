import { Module } from '@nestjs/common';
import { BillingController } from './billing.controller';
import { BillingService } from './billing.service';
import { FinanceAdminGuard } from './finance-admin.guard';

@Module({
  controllers: [BillingController],
  providers: [BillingService, FinanceAdminGuard],
})
export class BillingModule {}
