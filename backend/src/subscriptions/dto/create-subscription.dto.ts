import { Type } from 'class-transformer';
import { IsArray, IsDateString, IsInt, IsString, IsUUID, Min, ValidateNested } from 'class-validator';

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
  @IsString() paymentTerms!: string;
  @IsArray() @ValidateNested({ each: true }) @Type(() => SubscriptionItemDto)
  items!: SubscriptionItemDto[];
}
