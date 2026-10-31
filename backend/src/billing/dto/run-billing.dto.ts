import { IsDateString, Matches } from 'class-validator';

export class RunBillingDto {
  @IsDateString({ strict: true })
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  billingDate!: string;
}
