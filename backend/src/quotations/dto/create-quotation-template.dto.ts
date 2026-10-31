import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

class QuotationTemplateItemDto {
  @IsUUID()
  productId!: string;

  @IsOptional()
  @IsUUID()
  variantId?: string;

  @IsInt()
  @Min(1)
  quantity!: number;
}

export class CreateQuotationTemplateDto {
  @IsString()
  @MaxLength(255)
  name!: string;

  @IsUUID()
  planId!: string;

  @IsInt()
  @Min(1)
  validityDays!: number;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => QuotationTemplateItemDto)
  items!: QuotationTemplateItemDto[];
}
