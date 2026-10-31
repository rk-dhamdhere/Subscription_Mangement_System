import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { FinanceAdminGuard } from '../billing/finance-admin.guard';
import { RecordPaymentDto } from './dto/record-payment.dto';
import { PaymentsService } from './payments.service';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

@Controller('payments')
@ApiTags('Payments')
@ApiBearerAuth()
@UseGuards(FinanceAdminGuard)
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  @Get()
  list() {
    return this.payments.list();
  }

  @Post()
  record(
    @Body() dto: RecordPaymentDto,
    @Req() request: Request & { user: { id: string } },
  ) {
    return this.payments.record(dto, request.user.id);
  }
}
