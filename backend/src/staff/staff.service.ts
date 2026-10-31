import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as argon2 from 'argon2';
import { Prisma, Role } from '../generated/prisma/client';
import { PrismaService } from '../database/prisma.service';
import { CreateStaffDto } from './dto/create-staff.dto';
import { UpdateStaffDto } from './dto/update-staff.dto';

const staffSelection = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  staffRole: true,
  isActive: true,
  createdAt: true,
} satisfies Prisma.UserSelect;

@Injectable()
export class StaffService {
  constructor(private readonly prisma: PrismaService) {}

  list() {
    return this.prisma.user.findMany({
      where: { role: Role.STAFF },
      select: staffSelection,
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    });
  }

  async create(dto: CreateStaffDto, actorId: string) {
    const email = dto.email.trim().toLowerCase();
    const passwordHash = await argon2.hash(dto.password, {
      type: argon2.argon2id,
    });

    try {
      return await this.prisma.$transaction(async (tx) => {
        const staff = await tx.user.create({
          data: {
            email,
            passwordHash,
            firstName: dto.firstName.trim(),
            lastName: dto.lastName.trim(),
            role: Role.STAFF,
            staffRole: dto.staffRole,
          },
          select: staffSelection,
        });
        await tx.auditLog.create({
          data: {
            actorId,
            action: 'STAFF_CREATED',
            entityType: 'USER',
            entityId: staff.id,
            afterData: {
              email: staff.email,
              staffRole: staff.staffRole,
            },
          },
        });
        return staff;
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('email is already registered');
      }
      throw error;
    }
  }

  async update(id: string, dto: UpdateStaffDto, actorId: string) {
    if (dto.staffRole === undefined && dto.isActive === undefined) {
      throw new BadRequestException(
        'provide a staff role or active status to update',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const current = await tx.user.findFirst({
        where: { id, role: Role.STAFF },
        select: staffSelection,
      });
      if (!current) throw new NotFoundException('staff member not found');

      const updated = await tx.user.update({
        where: { id },
        data: {
          ...(dto.staffRole === undefined ? {} : { staffRole: dto.staffRole }),
          ...(dto.isActive === undefined ? {} : { isActive: dto.isActive }),
        },
        select: staffSelection,
      });
      await tx.auditLog.create({
        data: {
          actorId,
          action: 'STAFF_UPDATED',
          entityType: 'USER',
          entityId: updated.id,
          beforeData: {
            staffRole: current.staffRole,
            isActive: current.isActive,
          },
          afterData: {
            staffRole: updated.staffRole,
            isActive: updated.isActive,
          },
        },
      });
      return updated;
    });
  }
}
