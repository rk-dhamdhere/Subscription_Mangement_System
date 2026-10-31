import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createTransport, Transporter } from 'nodemailer';

interface InvoiceEmail {
  invoiceNumber: string;
  dueDate: Date;
  totalAmount: { toString: () => string };
  amountDue: { toString: () => string };
  customer: { email: string; firstName: string; lastName: string };
  subscription: { subscriptionNumber: string };
  items: Array<{
    description: string;
    quantity: number;
    totalAmount: { toString: () => string };
  }>;
}

@Injectable()
export class InvoiceMailer {
  private readonly logger = new Logger(InvoiceMailer.name);
  private transporter?: Transporter;

  constructor(private readonly config: ConfigService) {}

  async send(invoice: InvoiceEmail) {
    const host = this.config.get<string>('SMTP_HOST');
    const port = Number(this.config.get<string>('SMTP_PORT'));
    const user = this.config.get<string>('SMTP_USER');
    const password = this.config.get<string>('SMTP_PASSWORD');
    const from = this.config.get<string>('MAIL_FROM');
    if (
      !host ||
      !Number.isInteger(port) ||
      port < 1 ||
      port > 65535 ||
      !user ||
      !password ||
      !from
    ) {
      throw new ServiceUnavailableException(
        'invoice email delivery is not configured',
      );
    }

    const itemLines = invoice.items
      .map(
        (item) =>
          `- ${item.description} (quantity ${item.quantity}): INR ${item.totalAmount.toString()}`,
      )
      .join('\n');
    const dueDate = invoice.dueDate.toISOString().slice(0, 10);
    try {
      this.transporter ??= createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass: password },
      });
      await this.transporter.sendMail({
        from,
        to: invoice.customer.email,
        subject: `Brightloop invoice ${invoice.invoiceNumber}`,
        text: [
          `Hello ${invoice.customer.firstName} ${invoice.customer.lastName},`,
          '',
          `Invoice ${invoice.invoiceNumber} for subscription ${invoice.subscription.subscriptionNumber}.`,
          `Total: INR ${invoice.totalAmount.toString()}`,
          `Balance due: INR ${invoice.amountDue.toString()}`,
          `Due date: ${dueDate}`,
          '',
          'Items:',
          itemLines,
          '',
          'Sign in to your Brightloop customer portal to view the invoice and pay online.',
        ].join('\n'),
      });
    } catch (error) {
      this.logger.error(
        `Failed to deliver invoice ${invoice.invoiceNumber}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new ServiceUnavailableException('invoice email delivery failed');
    }
  }
}
