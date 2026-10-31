import { SubscriptionStatus } from '../../generated/prisma/client';
import { IsEnum } from 'class-validator';

export class TransitionSubscriptionDto {
  @IsEnum(SubscriptionStatus)
  status!: SubscriptionStatus;
}
