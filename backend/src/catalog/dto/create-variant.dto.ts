import { IsBoolean, IsNumber, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateVariantDto {
  @IsString() @MaxLength(100) name!: string;
  @IsNumber() priceExtra!: number;
  @IsOptional() @IsBoolean() isActive?: boolean;
}
