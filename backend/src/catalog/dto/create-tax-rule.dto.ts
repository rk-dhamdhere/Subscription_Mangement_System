import {
  IsBoolean,
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateTaxRuleDto {
  @IsString() @MaxLength(100) name!: string;
  @IsNumber() @Min(0) ratePercentage!: number;
  @IsDateString() effectiveFrom!: string;
  @IsOptional() @IsDateString() effectiveUntil?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
}
