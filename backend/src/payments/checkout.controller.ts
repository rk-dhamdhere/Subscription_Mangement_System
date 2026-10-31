import { Body, Controller, Post, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../generated/prisma/client';
import { CreateRazorpayOrderDto } from './dto/create-razorpay-order.dto';
import { VerifyRazorpayPaymentDto } from './dto/verify-razorpay-payment.dto';
import { PaymentsService } from './payments.service';

@Controller('payments/razorpay')
@ApiTags('Payments')
@ApiBearerAuth()
@Roles(Role.CUSTOMER)
export class CheckoutController {
  constructor(private readonly payments: PaymentsService) {}

  @Post('orders')
  createOrder(
    @Body() dto: CreateRazorpayOrderDto,
    @Req() request: Request & { user: { id: string } },
  ) {
    return this.payments.createRazorpayOrder(dto.invoiceId, request.user.id);
  }

  @Post('verify')
  verifyPayment(
    @Body() dto: VerifyRazorpayPaymentDto,
    @Req() request: Request & { user: { id: string } },
  ) {
    return this.payments.verifyRazorpayPayment(dto, request.user.id);
  }
}
