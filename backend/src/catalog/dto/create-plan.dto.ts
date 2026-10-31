import { BillingPeriod } from '../../generated/prisma/client';
import { IsBoolean, IsDateString, IsEnum, IsInt, IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class CreatePlanDto {
  @IsString() @MaxLength(255) name!: string;
  @IsEnum(BillingPeriod) billingPeriod!: BillingPeriod;
  @IsNumber() @Min(0) price!: number;
  @IsInt() @Min(1) minQuantity!: number;
  @IsDateString() startDate!: string;
  @IsOptional() @IsDateString() endDate?: string;
  @IsOptional() @IsBoolean() autoClose?: boolean;
  @IsOptional() @IsBoolean() canPause?: boolean;
  @IsOptional() @IsBoolean() canRenew?: boolean;
  @IsOptional() @IsBoolean() isActive?: boolean;
}
