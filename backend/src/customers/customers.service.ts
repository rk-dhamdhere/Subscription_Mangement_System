import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { Role } from '../generated/prisma/client';

@Injectable()
export class CustomersService {
  constructor(private readonly prisma: PrismaService) {}

  list(search?: string) {
    const term = search?.trim();
    return this.prisma.user.findMany({
      where: {
        role: Role.CUSTOMER,
        isActive: true,
        ...(term
          ? {
              OR: [
                { email: { contains: term, mode: 'insensitive' } },
                { firstName: { contains: term, mode: 'insensitive' } },
                { lastName: { contains: term, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        profile: { select: { legalName: true } },
      },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
      take: 100,
    });
  }
}
