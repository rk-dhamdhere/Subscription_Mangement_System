import {
  IsDateString,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
} from 'class-validator';

export class CreateQuotationDto {
  @IsUUID()
  customerId!: string;

  @IsUUID()
  templateId!: string;

  @IsDateString()
  startDate!: string;

  @IsDateString()
  expiryDate!: string;

  @IsString()
  @MaxLength(32)
  @Matches(/^(DUE_ON_RECEIPT|NET_\d+)$/)
  paymentTerms!: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  discountCode?: string;
}
