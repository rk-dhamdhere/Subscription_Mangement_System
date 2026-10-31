import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength } from 'class-validator';

export class VerifyRazorpayPaymentDto {
  @ApiProperty()
  @IsString()
  @MaxLength(100)
  razorpay_order_id!: string;

  @ApiProperty()
  @IsString()
  @MaxLength(100)
  razorpay_payment_id!: string;

  @ApiProperty()
  @IsString()
  @MaxLength(128)
  razorpay_signature!: string;
}
