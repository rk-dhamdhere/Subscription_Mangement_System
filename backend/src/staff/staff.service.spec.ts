import { describe, expect, it, jest } from '@jest/globals';

class MockHttpException extends Error {}

jest.mock('@nestjs/common', () => ({
  Injectable: () => (target: unknown) => target,
  BadRequestException: MockHttpException,
  ConflictException: MockHttpException,
  NotFoundException: MockHttpException,
}));

import { PrismaService } from '../database/prisma.service';
import { StaffService } from './staff.service';

describe('StaffService', () => {
  it('creates a scoped staff account with an audit record', async () => {
    const createdStaff = {
      id: 'staff-id',
      email: 'sales@example.test',
      firstName: 'Sales',
      lastName: 'Person',
      staffRole: 'SALES',
      isActive: true,
      createdAt: new Date('2026-10-31T00:00:00.000Z'),
    };
    const tx = {
      user: {
        create: jest
          .fn<() => Promise<typeof createdStaff>>()
          .mockResolvedValue(createdStaff),
      },
      auditLog: {
        create: jest
          .fn<() => Promise<{ id: string }>>()
          .mockResolvedValue({ id: 'audit-id' }),
      },
    };
    const prisma = {
      $transaction: jest.fn(
        <T>(callback: (transaction: typeof tx) => Promise<T>) => callback(tx),
      ),
    } as unknown as PrismaService;

    await expect(
      new StaffService(prisma).create(
        {
          email: ' Sales@Example.Test ',
          firstName: ' Sales ',
          lastName: ' Person ',
          password: 'StrongPass!123',
          staffRole: 'SALES',
        },
        'admin-id',
      ),
    ).resolves.toBe(createdStaff);
    expect(tx.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          email: 'sales@example.test',
          firstName: 'Sales',
          lastName: 'Person',
          role: 'STAFF',
          staffRole: 'SALES',
          passwordHash: expect.any(String),
        }),
        select: expect.not.objectContaining({ passwordHash: true }),
      }),
    );
    expect(tx.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          actorId: 'admin-id',
          action: 'STAFF_CREATED',
          entityId: 'staff-id',
        }),
      }),
    );
  });

  it('changes staff role and active status together transactionally', async () => {
    const current = {
      id: 'staff-id',
      email: 'sales@example.test',
      firstName: 'Sales',
      lastName: 'Person',
      staffRole: 'SALES',
      isActive: true,
      createdAt: new Date('2026-10-31T00:00:00.000Z'),
    };
    const updated = { ...current, staffRole: 'FINANCE', isActive: false };
    const tx = {
      user: {
        findFirst: jest
          .fn<() => Promise<typeof current | null>>()
          .mockResolvedValue(current),
        update: jest
          .fn<() => Promise<typeof updated>>()
          .mockResolvedValue(updated),
      },
      auditLog: {
        create: jest
          .fn<() => Promise<{ id: string }>>()
          .mockResolvedValue({ id: 'audit-id' }),
      },
    };
    const prisma = {
      $transaction: jest.fn(
        <T>(callback: (transaction: typeof tx) => Promise<T>) => callback(tx),
      ),
    } as unknown as PrismaService;

    await expect(
      new StaffService(prisma).update(
        'staff-id',
        { staffRole: 'FINANCE', isActive: false },
        'admin-id',
      ),
    ).resolves.toBe(updated);
    expect(tx.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'staff-id' },
        data: { staffRole: 'FINANCE', isActive: false },
      }),
    );
    expect(tx.auditLog.create).toHaveBeenCalled();
  });
});
