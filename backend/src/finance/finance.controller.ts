import { Controller, Get, UseGuards } from '@nestjs/common';
import { FinanceAdminGuard } from '../billing/finance-admin.guard';
import { FinanceService } from './finance.service';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

@Controller('finance')
@ApiTags('Finance')
@ApiBearerAuth()
@UseGuards(FinanceAdminGuard)
export class FinanceController {
  constructor(private readonly finance: FinanceService) {}

  @Get('dashboard')
  dashboard() {
    return this.finance.dashboard();
  }

  @Get('receivables/aging')
  aging() {
    return this.finance.receivablesAging();
  }
}
