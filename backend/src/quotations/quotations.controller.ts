import { Body, Controller, Get, Post } from '@nestjs/common';
import { Role } from '../generated/prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';
import { CreateQuotationTemplateDto } from './dto/create-quotation-template.dto';
import { QuotationsService } from './quotations.service';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

@Controller('quotation-templates')
@ApiTags('Quotations')
@ApiBearerAuth()
@Roles(Role.ADMIN)
export class QuotationsController {
  constructor(private readonly quotations: QuotationsService) {}

  @Get()
  list() {
    return this.quotations.listTemplates();
  }

  @Post()
  create(@Body() dto: CreateQuotationTemplateDto) {
    return this.quotations.createTemplate(dto);
  }
}
