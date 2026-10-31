import { Body, Controller, Headers, HttpCode, Post, Req } from '@nestjs/common';
import { ApiExcludeEndpoint } from '@nestjs/swagger';
import { Request } from 'express';
import { Public } from '../auth/decorators/public.decorator';
import { PaymentsService } from './payments.service';

@Controller('payments/razorpay')
export class RazorpayWebhookController {
  constructor(private readonly payments: PaymentsService) {}

  @Public()
  @Post('webhook')
  @HttpCode(200)
  @ApiExcludeEndpoint()
  handle(
    @Req() request: Request & { rawBody?: Buffer },
    @Headers('x-razorpay-signature') signature: string | undefined,
    @Body() payload: unknown,
  ) {
    return this.payments.processRazorpayWebhook(
      request.rawBody,
      signature,
      payload,
    );
  }
}
