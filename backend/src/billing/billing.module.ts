import { Module } from '@nestjs/common';
import { BillingController } from './billing.controller';
import { BillingService } from './billing.service';
import { FinanceAdminGuard } from './finance-admin.guard';
import { InvoiceController } from './invoice.controller';
import { InvoiceService } from './invoice.service';
import { FinanceOrCustomerGuard } from './finance-or-customer.guard';
import { InvoiceMailer } from './invoice-mailer.service';

@Module({
  controllers: [BillingController, InvoiceController],
  providers: [
    BillingService,
    InvoiceService,
    InvoiceMailer,
    FinanceAdminGuard,
    FinanceOrCustomerGuard,
  ],
})
export class BillingModule {}
