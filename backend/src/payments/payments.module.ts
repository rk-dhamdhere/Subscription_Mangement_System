import { Module } from '@nestjs/common';
import { FinanceAdminGuard } from '../billing/finance-admin.guard';
import { CheckoutController } from './checkout.controller';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { RazorpayWebhookController } from './razorpay-webhook.controller';

@Module({
  controllers: [
    PaymentsController,
    CheckoutController,
    RazorpayWebhookController,
  ],
  providers: [PaymentsService, FinanceAdminGuard],
})
export class PaymentsModule {}
