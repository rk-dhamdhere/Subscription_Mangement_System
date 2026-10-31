import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InvoiceStatus, Prisma, Role } from '../generated/prisma/client';
import { PrismaService } from '../database/prisma.service';
import { TransitionableInvoiceStatus } from './dto/transition-invoice.dto';

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
  constructor(private readonly prisma: PrismaService) {}

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
}
