import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { InvoiceStatus, Prisma, Role } from '../generated/prisma/client';
import { PrismaService } from '../database/prisma.service';
import { TransitionableInvoiceStatus } from './dto/transition-invoice.dto';
import { InvoiceMailer } from './invoice-mailer.service';

const invoiceDetails = {
  items: true,
  customer: {
    select: { id: true, email: true, firstName: true, lastName: true },
  },
  subscription: {
    select: { id: true, subscriptionNumber: true },
  },
} satisfies Prisma.InvoiceInclude;

@Injectable()
export class InvoiceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mailer?: InvoiceMailer,
  ) {}

  list(user: { id: string; role: Role }) {
    return this.prisma.invoice.findMany({
      where: user.role === Role.CUSTOMER ? { customerId: user.id } : undefined,
      include: invoiceDetails,
      orderBy: [{ issueDate: 'desc' }, { invoiceNumber: 'desc' }],
    });
  }

  async get(id: string, user: { id: string; role: Role }) {
    const invoice = await this.prisma.invoice.findUnique({
      where: {
        id,
        ...(user.role === Role.CUSTOMER ? { customerId: user.id } : {}),
      },
      include: invoiceDetails,
    });
    if (!invoice) throw new NotFoundException('invoice not found');
    return invoice;
  }

  async transition(
    id: string,
    next: TransitionableInvoiceStatus,
    actorId: string,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const current = await tx.invoice.findUnique({ where: { id } });
      if (!current) throw new NotFoundException('invoice not found');
      if (current.status !== InvoiceStatus.DRAFT) {
        throw new BadRequestException(
          `cannot transition invoice from ${current.status} to ${next}`,
        );
      }
      if (next === InvoiceStatus.CANCELLED && !current.paidAmount.equals(0)) {
        throw new BadRequestException(
          'an invoice with payments cannot be cancelled',
        );
      }

      const updated = await tx.invoice.updateMany({
        where: {
          id,
          status: InvoiceStatus.DRAFT,
          paidAmount: 0,
        },
        data: { status: next },
      });
      if (updated.count !== 1) {
        throw new BadRequestException(
          'invoice status or payment balance changed; reload and retry',
        );
      }

      await tx.auditLog.create({
        data: {
          actorId,
          action: `INVOICE_${next}`,
          entityType: 'INVOICE',
          entityId: id,
          beforeData: { status: current.status },
          afterData: { status: next },
        },
      });

      return tx.invoice.findUniqueOrThrow({
        where: { id },
        include: invoiceDetails,
      });
    });
  }

  async send(id: string, actorId: string) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id },
      include: invoiceDetails,
    });
    if (!invoice) throw new NotFoundException('invoice not found');
    if (invoice.status === InvoiceStatus.DRAFT || invoice.status === InvoiceStatus.CANCELLED) {
      throw new BadRequestException(
        'only confirmed or paid invoices can be emailed',
      );
    }

    if (!this.mailer) {
      throw new ServiceUnavailableException(
        'invoice email delivery is not configured',
      );
    }
    await this.mailer.send(invoice);
    await this.prisma.auditLog.create({
      data: {
        actorId,
        action: 'INVOICE_EMAILED',
        entityType: 'INVOICE',
        entityId: invoice.id,
        afterData: { recipient: invoice.customer.email },
      },
    });
    return { message: `invoice ${invoice.invoiceNumber} emailed` };
  }
}
