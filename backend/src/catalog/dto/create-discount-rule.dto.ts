import { DiscountType } from '../../generated/prisma/client';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateDiscountRuleDto {
  @IsString() @MaxLength(50) code!: string;
  @IsEnum(DiscountType) discountType!: DiscountType;
  @IsNumber() @Min(0) value!: number;
  @IsOptional() @IsNumber() @Min(0) minPurchaseAmount?: number;
  @IsOptional() @IsInt() @Min(0) minQuantity?: number;
  @IsOptional() @IsInt() @Min(1) maxUses?: number;
  @IsDateString() startDate!: string;
  @IsDateString() endDate!: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
}
