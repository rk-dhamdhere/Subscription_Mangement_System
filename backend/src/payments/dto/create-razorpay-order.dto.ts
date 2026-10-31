import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class CreateRazorpayOrderDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  invoiceId!: string;
}
