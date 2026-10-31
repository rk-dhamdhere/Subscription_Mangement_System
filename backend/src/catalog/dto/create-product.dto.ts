import { IsBoolean, IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class CreateProductDto {
  @IsString() @MaxLength(255) name!: string;
  @IsString() @MaxLength(100) productType!: string;
  @IsNumber() @Min(0) salesPrice!: number;
  @IsNumber() @Min(0) costPrice!: number;
  @IsOptional() @IsString() notes?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
}
