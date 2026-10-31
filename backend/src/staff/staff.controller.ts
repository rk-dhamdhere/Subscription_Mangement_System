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
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../generated/prisma/client';
import { CreateStaffDto } from './dto/create-staff.dto';
import { UpdateStaffDto } from './dto/update-staff.dto';
import { StaffService } from './staff.service';

@Controller('staff')
@ApiTags('Staff')
@ApiBearerAuth()
@Roles(Role.ADMIN)
export class StaffController {
  constructor(private readonly staff: StaffService) {}

  @Get()
  list() {
    return this.staff.list();
  }

  @Post()
  create(
    @Body() dto: CreateStaffDto,
    @Req() request: Request & { user: { id: string } },
  ) {
    return this.staff.create(dto, request.user.id);
  }

  @Patch(':id')
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateStaffDto,
    @Req() request: Request & { user: { id: string } },
  ) {
    return this.staff.update(id, dto, request.user.id);
  }
}
