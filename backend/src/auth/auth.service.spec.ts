import { createHash } from 'node:crypto';
import { describe, expect, it, jest } from '@jest/globals';

class MockHttpException extends Error {}

jest.mock('@nestjs/common', () => ({
  Injectable: () => (target: unknown) => target,
  BadRequestException: MockHttpException,
  ConflictException: MockHttpException,
  UnauthorizedException: MockHttpException,
  Logger: class {
    log() {}
  },
}));
jest.mock('@nestjs/jwt', () => ({ JwtService: class {} }));
jest.mock('./password-reset-mailer.service', () => ({
  PasswordResetMailer: class {},
}));

import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../database/prisma.service';
import { PasswordResetMailer } from './password-reset-mailer.service';
import { AuthService } from './auth.service';

describe('AuthService password reset', () => {
  const resolved = <T>(value: T) =>
    jest.fn<() => Promise<T>>().mockResolvedValue(value);

  it('stores only the reset-token hash and emails the raw token', async () => {
    const user = {
      id: 'user-id',
      email: 'person@example.test',
      isActive: true,
    };
    const createToken = jest
      .fn<
        (input: {
          data: { userId: string; tokenHash: string; expiresAt: Date };
        }) => Promise<unknown>
      >()
      .mockResolvedValue({});
    const tx = {
      passwordResetToken: {
        deleteMany: resolved({ count: 0 }),
        create: createToken,
      },
    };
    const prisma = {
      user: { findUnique: resolved(user) },
      passwordResetToken: {
        deleteMany: resolved({ count: 1 }),
      },
      $transaction: jest.fn(
        <T>(callback: (transaction: typeof tx) => Promise<T>) => callback(tx),
      ),
    } as unknown as PrismaService;
    const mailer = {
      send: jest
        .fn<(to: string, token: string) => Promise<void>>()
        .mockResolvedValue(undefined),
    };
    const auth = new AuthService(
      prisma,
      {} as JwtService,
      mailer as unknown as PasswordResetMailer,
    );

    await expect(
      auth.requestPasswordReset({ email: ' Person@Example.Test ' }),
    ).resolves.toEqual({
      message:
        'If an active account exists for that email, reset instructions will be sent.',
    });

    const rawToken = mailer.send.mock.calls[0][1];
    const stored = createToken.mock.calls[0][0].data;
    expect(stored.userId).toBe('user-id');
    expect(stored.tokenHash).toBe(
      createHash('sha256').update(rawToken).digest('hex'),
    );
    expect(stored.tokenHash).not.toBe(rawToken);
    expect(stored.expiresAt.getTime()).toBeGreaterThan(Date.now());
  });

  it('consumes a valid token once and updates the password transactionally', async () => {
    const token = {
      id: 'token-id',
      userId: 'user-id',
      expiresAt: new Date(Date.now() + 60_000),
      usedAt: null,
    };
    const tx = {
      passwordResetToken: {
        updateMany: resolved({ count: 1 }),
        deleteMany: resolved({ count: 0 }),
      },
      user: {
        update: jest
          .fn<
            (input: {
              data: {
                passwordHash: string;
                tokenVersion: { increment: number };
              };
            }) => Promise<unknown>
          >()
          .mockResolvedValue({}),
      },
      auditLog: { create: resolved({}) },
    };
    const prisma = {
      passwordResetToken: { findUnique: resolved(token) },
      $transaction: jest.fn(
        <T>(callback: (transaction: typeof tx) => Promise<T>) => callback(tx),
      ),
    } as unknown as PrismaService;
    const auth = new AuthService(
      prisma,
      {} as JwtService,
      {} as PasswordResetMailer,
    );

    await expect(
      auth.completePasswordReset({
        token: 'A'.repeat(43),
        password: 'StrongPass!123',
      }),
    ).resolves.toEqual({ message: 'password has been reset' });
    expect(tx.passwordResetToken.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: 'token-id', usedAt: null }),
      }),
    );
    expect(tx.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'user-id' },
        data: expect.objectContaining({
          passwordHash: expect.any(String),
          tokenVersion: { increment: 1 },
        }),
      }),
    );
    expect(tx.auditLog.create).toHaveBeenCalled();
  });
});
