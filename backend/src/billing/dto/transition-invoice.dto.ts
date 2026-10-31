import { InvoiceStatus } from '../../generated/prisma/client';
import { IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export type TransitionableInvoiceStatus =
  typeof InvoiceStatus.CONFIRMED | typeof InvoiceStatus.CANCELLED;

export class TransitionInvoiceDto {
  @ApiProperty({ enum: [InvoiceStatus.CONFIRMED, InvoiceStatus.CANCELLED] })
  @IsIn([InvoiceStatus.CONFIRMED, InvoiceStatus.CANCELLED])
  status!: TransitionableInvoiceStatus;
}
