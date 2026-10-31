import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../generated/prisma/client';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { TransitionSubscriptionDto } from './dto/transition-subscription.dto';
import { SubscriptionsService } from './subscriptions.service';

@Controller('subscriptions')
@Roles(Role.ADMIN, Role.STAFF)
export class SubscriptionsController {
  constructor(private readonly subscriptions: SubscriptionsService) {}
  @Get() list() { return this.subscriptions.list(); }
  @Post() create(@Body() dto: CreateSubscriptionDto) { return this.subscriptions.createDraft(dto); }
  @Patch(':id/status') transition(@Param('id') id: string, @Body() dto: TransitionSubscriptionDto) { return this.subscriptions.transition(id, dto.status); }
}
