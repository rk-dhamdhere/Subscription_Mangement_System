import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

class SubscriptionItemDto {
  @IsUUID() productId!: string;
  @IsUUID() variantId?: string;
  @IsInt() @Min(1) quantity!: number;
}

export class CreateSubscriptionDto {
  @IsUUID() customerId!: string;
  @IsUUID() planId!: string;
  @IsDateString() startDate!: string;
  @IsDateString() expiryDate!: string;
  @IsString()
  @MaxLength(32)
  @Matches(/^(DUE_ON_RECEIPT|NET_\d+)$/)
  paymentTerms!: string;
  @IsOptional()
  @IsString()
  @MaxLength(50)
  discountCode?: string;
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SubscriptionItemDto)
  items!: SubscriptionItemDto[];
}
