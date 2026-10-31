import { Module } from '@nestjs/common';
import { FinanceAdminGuard } from '../billing/finance-admin.guard';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';

@Module({
  controllers: [PaymentsController],
  providers: [PaymentsService, FinanceAdminGuard],
})
export class PaymentsModule {}
