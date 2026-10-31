import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { Role } from '../generated/prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';
import { FinanceAdminGuard } from './finance-admin.guard';
import { FinanceOrCustomerGuard } from './finance-or-customer.guard';
import { TransitionInvoiceDto } from './dto/transition-invoice.dto';
import { InvoiceService } from './invoice.service';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

@Controller('invoices')
@ApiTags('Invoices')
@ApiBearerAuth()
export class InvoiceController {
  constructor(private readonly invoices: InvoiceService) {}

  @Get()
  @UseGuards(FinanceOrCustomerGuard)
  list(@Req() request: Request & { user: { id: string; role: Role } }) {
    return this.invoices.list(request.user);
  }

  @Get(':id')
  @UseGuards(FinanceOrCustomerGuard)
  get(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Req() request: Request & { user: { id: string; role: Role } },
  ) {
    return this.invoices.get(id, request.user);
  }

  @Patch(':id/status')
  @UseGuards(FinanceAdminGuard)
  @Roles(Role.ADMIN, Role.STAFF)
  transition(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: TransitionInvoiceDto,
    @Req() request: Request & { user: { id: string } },
  ) {
    return this.invoices.transition(id, dto.status, request.user.id);
  }
}
