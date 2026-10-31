import { StaffRole } from '../../generated/prisma/client';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsIn, IsOptional } from 'class-validator';

export class UpdateStaffDto {
  @ApiPropertyOptional({
    enum: [StaffRole.SALES, StaffRole.FINANCE, StaffRole.NONE],
  })
  @IsOptional()
  @IsIn([StaffRole.SALES, StaffRole.FINANCE, StaffRole.NONE])
  staffRole?: Extract<StaffRole, 'SALES' | 'FINANCE' | 'NONE'>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
