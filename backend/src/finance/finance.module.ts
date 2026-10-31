import { Module } from '@nestjs/common';
import { FinanceAdminGuard } from '../billing/finance-admin.guard';
import { FinanceController } from './finance.controller';
import { FinanceService } from './finance.service';

@Module({
  controllers: [FinanceController],
  providers: [FinanceService, FinanceAdminGuard],
})
export class FinanceModule {}
