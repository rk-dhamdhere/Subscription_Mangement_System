import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
} from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator';
import { Request } from 'express';
import { Role } from '../generated/prisma/client';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { TransitionSubscriptionDto } from './dto/transition-subscription.dto';
import { CreateQuotationDto } from './dto/create-quotation.dto';
import { SubscriptionsService } from './subscriptions.service';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

@Controller('subscriptions')
@ApiTags('Subscriptions')
@ApiBearerAuth()
@Roles(Role.ADMIN, Role.STAFF)
export class SubscriptionsController {
  constructor(private readonly subscriptions: SubscriptionsService) {}
  @Get()
  @Roles(Role.ADMIN, Role.STAFF, Role.CUSTOMER)
  list(@Req() request: Request & { user: { id: string; role: Role } }) {
    return this.subscriptions.list(request.user);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.STAFF, Role.CUSTOMER)
  get(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Req() request: Request & { user: { id: string; role: Role } },
  ) {
    return this.subscriptions.get(id, request.user);
  }

  @Post()
  create(
    @Body() dto: CreateSubscriptionDto,
    @Req() request: Request & { user: { id: string } },
  ) {
    return this.subscriptions.createDraft(dto, undefined, request.user.id);
  }

  @Post('from-template')
  createQuotation(
    @Body() dto: CreateQuotationDto,
    @Req() request: Request & { user: { id: string } },
  ) {
    return this.subscriptions.createQuotation(dto, request.user.id);
  }

  @Patch(':id/status')
  transition(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: TransitionSubscriptionDto,
    @Req() request: Request & { user: { id: string } },
  ) {
    return this.subscriptions.transition(id, dto.status, request.user.id);
  }
}
