import { Type } from 'class-transformer';
import {
  ArrayUnique,
  IsArray,
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class PaymentAllocationDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  invoiceId!: string;

  @Type(() => Number)
  @ApiProperty({ example: 25.5, minimum: 0.01 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount!: number;
}

export class RecordPaymentDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  customerId!: string;

  @ApiProperty({ example: 'BANK-REF-2026-0001' })
  @IsString()
  @MaxLength(255)
  paymentReference!: string;

  @ApiProperty({ example: 'BANK_TRANSFER' })
  @IsString()
  @MaxLength(100)
  paymentMethod!: string;

  @ApiProperty({ example: '2026-10-31T12:00:00.000Z' })
  @IsDateString()
  receivedAt!: string;

  @Type(() => Number)
  @ApiProperty({ example: 50, minimum: 0.01 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount!: number;

  @IsOptional()
  @ApiPropertyOptional({ maxLength: 2000 })
  @IsString()
  @MaxLength(2000)
  notes?: string;

  @IsOptional()
  @ApiPropertyOptional({ type: [PaymentAllocationDto] })
  @IsArray()
  @ArrayUnique((allocation: PaymentAllocationDto) => allocation.invoiceId)
  @ValidateNested({ each: true })
  @Type(() => PaymentAllocationDto)
  allocations?: PaymentAllocationDto[];
}
