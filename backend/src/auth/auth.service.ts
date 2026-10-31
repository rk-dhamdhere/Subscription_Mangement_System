import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { createHash, randomBytes } from 'node:crypto';
import { PrismaService } from '../database/prisma.service';
import { CompletePasswordResetDto } from './dto/complete-password-reset.dto';
import { LoginDto } from './dto/login.dto';
import { RequestPasswordResetDto } from './dto/request-password-reset.dto';
import { RegisterDto } from './dto/register.dto';
import { PasswordResetMailer } from './password-reset-mailer.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly resetMailer: PasswordResetMailer,
  ) {}

  async register(dto: RegisterDto) {
    const email = dto.email.trim().toLowerCase();
    if (await this.prisma.user.findUnique({ where: { email } }))
      throw new ConflictException('email is already registered');
    const passwordHash = await argon2.hash(dto.password, {
      type: argon2.argon2id,
    });
    const user = await this.prisma.user.create({
      data: {
        email,
        passwordHash,
        firstName: dto.firstName.trim(),
        lastName: dto.lastName.trim(),
      },
    });
    return this.issueToken(
      user.id,
      user.email,
      user.role,
      user.staffRole,
      0,
      `${user.firstName} ${user.lastName}`,
    );
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.trim().toLowerCase() },
    });
    if (
      !user ||
      !user.isActive ||
      !(await argon2.verify(user.passwordHash, dto.password))
    ) {
      throw new UnauthorizedException('invalid email or password');
    }
    return this.issueToken(
      user.id,
      user.email,
      user.role,
      user.staffRole,
      user.tokenVersion,
      `${user.firstName} ${user.lastName}`,
    );
  }

  async requestPasswordReset(dto: RequestPasswordResetDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.trim().toLowerCase() },
    });
    if (!user || !user.isActive) {
      return {
        message:
          'If an active account exists for that email, reset instructions will be sent.',
      };
    }

    const token = randomBytes(32).toString('base64url');
    const tokenHash = hashResetToken(token);
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);
    await this.prisma.$transaction(async (tx) => {
      await tx.passwordResetToken.deleteMany({
        where: { userId: user.id, usedAt: null },
      });
      await tx.passwordResetToken.create({
        data: { userId: user.id, tokenHash, expiresAt },
      });
    });

    try {
      await this.resetMailer.send(user.email, token);
    } catch (error) {
      await this.prisma.passwordResetToken.deleteMany({ where: { tokenHash } });
      throw error;
    }

    return {
      message:
        'If an active account exists for that email, reset instructions will be sent.',
    };
  }

  async completePasswordReset(dto: CompletePasswordResetDto) {
    const tokenHash = hashResetToken(dto.token);
    const token = await this.prisma.passwordResetToken.findUnique({
      where: { tokenHash },
      select: { id: true, userId: true, expiresAt: true, usedAt: true },
    });
    if (!token || token.usedAt || token.expiresAt <= new Date()) {
      throw new BadRequestException(
        'password reset token is invalid or expired',
      );
    }

    const passwordHash = await argon2.hash(dto.password, {
      type: argon2.argon2id,
    });
    await this.prisma.$transaction(async (tx) => {
      const claimed = await tx.passwordResetToken.updateMany({
        where: {
          id: token.id,
          usedAt: null,
          expiresAt: { gt: new Date() },
        },
        data: { usedAt: new Date() },
      });
      if (claimed.count !== 1) {
        throw new BadRequestException(
          'password reset token is invalid or expired',
        );
      }

      await tx.user.update({
        where: { id: token.userId },
        data: { passwordHash, tokenVersion: { increment: 1 } },
      });
      await tx.passwordResetToken.deleteMany({
        where: { userId: token.userId, id: { not: token.id } },
      });
      await tx.auditLog.create({
        data: {
          actorId: token.userId,
          action: 'PASSWORD_RESET',
          entityType: 'USER',
          entityId: token.userId,
        },
      });
    });

    this.logger.log(`Password reset completed for account ${token.userId}`);
    return { message: 'password has been reset' };
  }

  private async issueToken(
    id: string,
    email: string,
    role: string,
    staffRole: string,
    tokenVersion: number,
    fullName: string,
  ) {
    return {
      accessToken: await this.jwt.signAsync({
        sub: id,
        email,
        role,
        staffRole,
        tokenVersion,
        fullName,
      }),
      tokenType: 'Bearer',
    };
  }
}

function hashResetToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
