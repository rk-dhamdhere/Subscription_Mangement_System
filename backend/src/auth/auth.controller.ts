import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { ApiTags } from '@nestjs/swagger';
import { Public } from './decorators/public.decorator';
import { AuthService } from './auth.service';
import { CompletePasswordResetDto } from './dto/complete-password-reset.dto';
import { LoginDto } from './dto/login.dto';
import { RequestPasswordResetDto } from './dto/request-password-reset.dto';
import { RegisterDto } from './dto/register.dto';

@Controller('auth')
@ApiTags('Authentication')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Post('register')
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto);
  }

  @Public()
  @Post('login')
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto);
  }

  @Public()
  @Post('password-reset/request')
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  requestPasswordReset(@Body() dto: RequestPasswordResetDto) {
    return this.auth.requestPasswordReset(dto);
  }

  @Public()
  @Post('password-reset/complete')
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  completePasswordReset(@Body() dto: CompletePasswordResetDto) {
    return this.auth.completePasswordReset(dto);
  }
}
