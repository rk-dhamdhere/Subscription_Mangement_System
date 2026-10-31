import { IsDateString, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RunBillingDto {
  @ApiProperty({ example: '2026-10-31', format: 'date' })
  @IsDateString({ strict: true })
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  billingDate!: string;
}
