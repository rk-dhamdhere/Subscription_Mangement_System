import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../generated/prisma/client';
import { CustomersService } from './customers.service';

@Controller('customers')
@ApiTags('Customers')
@ApiBearerAuth()
@Roles(Role.ADMIN, Role.STAFF)
export class CustomersController {
  constructor(private readonly customers: CustomersService) {}

  @Get()
  list(@Query('search') search?: string) {
    return this.customers.list(search);
  }
}
