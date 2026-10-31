import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createTransport, Transporter } from 'nodemailer';

@Injectable()
export class PasswordResetMailer {
  private readonly logger = new Logger(PasswordResetMailer.name);
  private transporter?: Transporter;

  constructor(private readonly config: ConfigService) {}

  async send(to: string, token: string) {
    const host = this.config.get<string>('SMTP_HOST');
    const port = Number(this.config.get<string>('SMTP_PORT'));
    const user = this.config.get<string>('SMTP_USER');
    const password = this.config.get<string>('SMTP_PASSWORD');
    const from = this.config.get<string>('MAIL_FROM');
    const frontendUrl = this.config.get<string>('FRONTEND_URL');
    if (
      !host ||
      !Number.isInteger(port) ||
      port < 1 ||
      port > 65535 ||
      !user ||
      !password ||
      !from ||
      !frontendUrl
    ) {
      throw new ServiceUnavailableException(
        'password reset email delivery is not configured',
      );
    }

    try {
      this.transporter ??= createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass: password },
      });
      const resetUrl = new URL('/reset-password', frontendUrl);
      resetUrl.searchParams.set('token', token);
      await this.transporter.sendMail({
        from,
        to,
        subject: 'Reset your Brightloop password',
        text: `Use this link within 30 minutes to reset your password: ${resetUrl.toString()}`,
      });
    } catch (error) {
      this.logger.error(
        'Failed to deliver a password reset email',
        error instanceof Error ? error.stack : undefined,
      );
      throw new ServiceUnavailableException(
        'password reset email delivery failed',
      );
    }
  }
}
