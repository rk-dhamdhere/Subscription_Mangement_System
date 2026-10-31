import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('JWT_SECRET'),
    });
  }

  async validate(payload: { sub: string; tokenVersion: number }) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });
    if (!user || !user.isActive || payload.tokenVersion !== user.tokenVersion) {
      throw new UnauthorizedException();
    }
    return {
      id: user.id,
      email: user.email,
      role: user.role,
      staffRole: user.staffRole,
    };
  }
}
