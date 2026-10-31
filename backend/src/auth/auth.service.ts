import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { PrismaService } from '../database/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService, private readonly jwt: JwtService) {}

  async register(dto: RegisterDto) {
    const email = dto.email.trim().toLowerCase();
    if (await this.prisma.user.findUnique({ where: { email } })) throw new ConflictException('email is already registered');
    const passwordHash = await argon2.hash(dto.password, { type: argon2.argon2id });
    const user = await this.prisma.user.create({
      data: { email, passwordHash, firstName: dto.firstName.trim(), lastName: dto.lastName.trim() },
    });
    return this.issueToken(user.id, user.email, user.role, user.staffRole);
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email.trim().toLowerCase() } });
    if (!user || !user.isActive || !(await argon2.verify(user.passwordHash, dto.password))) {
      throw new UnauthorizedException('invalid email or password');
    }
    return this.issueToken(user.id, user.email, user.role, user.staffRole);
  }

  private async issueToken(id: string, email: string, role: string, staffRole: string) {
    return {
      accessToken: await this.jwt.signAsync({ sub: id, email, role, staffRole }),
      tokenType: 'Bearer',
    };
  }
}
