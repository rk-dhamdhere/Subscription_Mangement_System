import 'dotenv/config';
import * as argon2 from 'argon2';
import { PrismaService } from './prisma.service';

const ids = {
  admin: '10000000-0000-4000-8000-000000000001',
  admin2: '10000000-0000-4000-8000-000000000004',
  finance: '10000000-0000-4000-8000-000000000002',
  sales: '10000000-0000-4000-8000-000000000005',
  sales2: '10000000-0000-4000-8000-000000000006',
  general: '10000000-0000-4000-8000-000000000007',
  customer: '10000000-0000-4000-8000-000000000003',
  customer2: '10000000-0000-4000-8000-000000000008',
  customer3: '10000000-0000-4000-8000-000000000009',
  product: '20000000-0000-4000-8000-000000000001',
  standardVariant: '20000000-0000-4000-8000-000000000002',
  odooVariant: '20000000-0000-4000-8000-000000000003',
  addonProduct: '20000000-0000-4000-8000-000000000004',
  monthlyPlan: '30000000-0000-4000-8000-000000000001',
  yearlyPlan: '30000000-0000-4000-8000-000000000002',
  template: '40000000-0000-4000-8000-000000000001',
  subscription: '50000000-0000-4000-8000-000000000001',
  subscription2: '50000000-0000-4000-8000-000000000002',
  subscription3: '50000000-0000-4000-8000-000000000003',
  overdueInvoice: '60000000-0000-4000-8000-000000000001',
  upcomingInvoice: '60000000-0000-4000-8000-000000000002',
  paidInvoice: '60000000-0000-4000-8000-000000000003',
  paidPayment: '70000000-0000-4000-8000-000000000001',
} as const;

const taxRate = 18;
const monthlyPlanPrice = 999;
const productPrice = 499;
const standardSubtotal = 1498;
const standardTax = 269.64;
const standardTotal = 1767.64;
const odooSubtotal = 4176;
const odooTax = 751.68;
const odooTotal = 4927.68;
const yearlySubtotal = 12494;
const yearlyTax = 2248.92;
const yearlyTotal = 14742.92;

async function seed() {
  const demoPassword = process.env.BRIGHTLOOP_DEMO_PASSWORD;
  if (!demoPassword || demoPassword.length < 12) {
    throw new Error(
      'BRIGHTLOOP_DEMO_PASSWORD must be configured with at least 12 characters',
    );
  }
  const passwordHash = await argon2.hash(demoPassword, {
    type: argon2.argon2id,
  });
  const prisma = new PrismaService();
  await prisma.$connect();

  try {
    await prisma.$transaction(async (tx) => {
      const users = [
        {
          id: ids.admin,
          email: 'admin@brightloop.example.test',
          firstName: 'Alex',
          lastName: 'Morgan',
          role: 'ADMIN' as const,
          staffRole: 'NONE' as const,
        },
        {
          id: ids.admin2,
          email: 'admin2@brightloop.example.test',
          firstName: 'Jordan',
          lastName: 'Lee',
          role: 'ADMIN' as const,
          staffRole: 'NONE' as const,
        },
        {
          id: ids.finance,
          email: 'finance@brightloop.example.test',
          firstName: 'Riya',
          lastName: 'Shah',
          role: 'STAFF' as const,
          staffRole: 'FINANCE' as const,
        },
        {
          id: ids.sales,
          email: 'sales@brightloop.example.test',
          firstName: 'Noah',
          lastName: 'Patel',
          role: 'STAFF' as const,
          staffRole: 'SALES' as const,
        },
        {
          id: ids.sales2,
          email: 'sales2@brightloop.example.test',
          firstName: 'Maya',
          lastName: 'Rao',
          role: 'STAFF' as const,
          staffRole: 'SALES' as const,
        },
        {
          id: ids.general,
          email: 'operations@brightloop.example.test',
          firstName: 'Aarav',
          lastName: 'Mehta',
          role: 'STAFF' as const,
          staffRole: 'NONE' as const,
        },
        {
          id: ids.customer,
          email: 'customer@brightloop.example.test',
          firstName: 'Sam',
          lastName: 'Taylor',
          role: 'CUSTOMER' as const,
          staffRole: 'NONE' as const,
        },
        {
          id: ids.customer2,
          email: 'customer2@brightloop.example.test',
          firstName: 'Anika',
          lastName: 'Desai',
          role: 'CUSTOMER' as const,
          staffRole: 'NONE' as const,
        },
        {
          id: ids.customer3,
          email: 'customer3@brightloop.example.test',
          firstName: 'Kabir',
          lastName: 'Joshi',
          role: 'CUSTOMER' as const,
          staffRole: 'NONE' as const,
        },
      ];

      for (const user of users) {
        await tx.user.upsert({
          where: { id: user.id },
          create: { ...user, passwordHash },
          update: {
            ...user,
            passwordHash,
            tokenVersion: 0,
            isActive: true,
          },
        });
      }

      const customers = [
        { id: ids.customer, legalName: 'Taylor Retail' },
        { id: ids.customer2, legalName: 'Desai Design Studio' },
        { id: ids.customer3, legalName: 'Joshi Analytics' },
      ];
      for (const customer of customers) {
        const user = users.find((candidate) => candidate.id === customer.id)!;
        await tx.customerProfile.upsert({
          where: { userId: customer.id },
          create: {
            userId: customer.id,
            legalName: customer.legalName,
            billingEmail: user.email,
          },
          update: {
            legalName: customer.legalName,
            billingEmail: user.email,
          },
        });
      }

      await tx.product.upsert({
        where: { id: ids.product },
        create: {
          id: ids.product,
          name: 'Brightloop Workspace',
          productType: 'SOFTWARE',
          salesPrice: productPrice,
          costPrice: 120,
          notes: 'Team workspace with configurable editions.',
          isActive: true,
        },
        update: {
          name: 'Brightloop Workspace',
          salesPrice: productPrice,
          costPrice: 120,
          isActive: true,
        },
      });
      await tx.productVariant.upsert({
        where: { id: ids.standardVariant },
        create: {
          id: ids.standardVariant,
          productId: ids.product,
          name: 'Standard',
          priceExtra: 0,
          isActive: true,
        },
        update: { name: 'Standard', priceExtra: 0, isActive: true },
      });
      await tx.productVariant.upsert({
        where: { id: ids.odooVariant },
        create: {
          id: ids.odooVariant,
          productId: ids.product,
          name: 'Odoo',
          priceExtra: 560,
          isActive: true,
        },
        update: { name: 'Odoo', priceExtra: 560, isActive: true },
      });
      await tx.product.upsert({
        where: { id: ids.addonProduct },
        create: {
          id: ids.addonProduct,
          name: 'Revenue Insights',
          productType: 'ADD_ON',
          salesPrice: 299,
          costPrice: 60,
          notes: 'Subscription analytics add-on.',
          isActive: true,
        },
        update: { isActive: true },
      });

      const startDate = new Date('2026-01-01T00:00:00.000Z');
      await tx.plan.upsert({
        where: { id: ids.monthlyPlan },
        create: {
          id: ids.monthlyPlan,
          name: 'Growth Monthly',
          billingPeriod: 'MONTHLY',
          price: monthlyPlanPrice,
          minQuantity: 1,
          startDate,
          canPause: true,
          canRenew: true,
          isActive: true,
        },
        update: { isActive: true },
      });
      await tx.plan.upsert({
        where: { id: ids.yearlyPlan },
        create: {
          id: ids.yearlyPlan,
          name: 'Scale Annual',
          billingPeriod: 'YEARLY',
          price: 9999,
          minQuantity: 3,
          startDate,
          autoClose: true,
          canPause: false,
          canCloseEarly: false,
          canRenew: true,
          isActive: true,
        },
        update: {
          autoClose: true,
          canPause: false,
          canCloseEarly: false,
          canRenew: true,
          isActive: true,
        },
      });
      await tx.taxRule.upsert({
        where: { id: '80000000-0000-4000-8000-000000000001' },
        create: {
          id: '80000000-0000-4000-8000-000000000001',
          name: 'GST demo rate',
          ratePercentage: taxRate,
          effectiveFrom: startDate,
          isActive: true,
        },
        update: { ratePercentage: taxRate, isActive: true },
      });
      await tx.discountRule.upsert({
        where: { code: 'SEAT10' },
        create: {
          id: '80000000-0000-4000-8000-000000000002',
          code: 'SEAT10',
          discountType: 'PERCENTAGE',
          value: 10,
          minPurchaseAmount: 1000,
          minQuantity: 3,
          maxUses: 100,
          currentUses: 1,
          startDate,
          endDate: new Date('2027-12-31T00:00:00.000Z'),
          isActive: true,
        },
        update: { isActive: true },
      });
      await tx.quotationTemplate.upsert({
        where: { id: ids.template },
        create: {
          id: ids.template,
          name: 'Growth workspace proposal',
          planId: ids.monthlyPlan,
          validityDays: 30,
          items: {
            create: {
              productId: ids.product,
              variantId: ids.standardVariant,
              quantity: 1,
            },
          },
        },
        update: { isActive: true },
      });

      const subscriptionData = [
        {
          id: ids.subscription,
          number: 'SUB-DEMO-0001',
          customerId: ids.customer,
          planId: ids.monthlyPlan,
          subtotal: standardSubtotal,
          tax: standardTax,
          total: standardTotal,
          itemQuantity: 1,
          variantId: ids.standardVariant,
          variantName: 'Standard',
          nextDate: new Date('2026-11-01T00:00:00.000Z'),
        },
        {
          id: ids.subscription2,
          number: 'SUB-DEMO-0002',
          customerId: ids.customer2,
          planId: ids.monthlyPlan,
          subtotal: odooSubtotal,
          tax: odooTax,
          total: odooTotal,
          itemQuantity: 3,
          variantId: ids.odooVariant,
          variantName: 'Odoo',
          nextDate: new Date('2026-11-01T00:00:00.000Z'),
        },
        {
          id: ids.subscription3,
          number: 'SUB-DEMO-0003',
          customerId: ids.customer3,
          planId: ids.yearlyPlan,
          subtotal: yearlySubtotal,
          tax: yearlyTax,
          total: yearlyTotal,
          itemQuantity: 5,
          variantId: ids.standardVariant,
          variantName: 'Standard',
          nextDate: new Date('2027-01-01T00:00:00.000Z'),
        },
      ];
      for (const subscription of subscriptionData) {
        await tx.subscription.upsert({
          where: { id: subscription.id },
          create: {
            id: subscription.id,
            subscriptionNumber: subscription.number,
            customerId: subscription.customerId,
            planId: subscription.planId,
            status: 'ACTIVE',
            startDate,
            expiryDate: new Date('2027-12-31T00:00:00.000Z'),
            nextBillingDate: subscription.nextDate,
            paymentTerms: 'NET_30',
            subtotalAmount: subscription.subtotal,
            taxAmount: subscription.tax,
            totalAmount: subscription.total,
            items: {
              create: {
                productId: ids.product,
                variantId: subscription.variantId,
                productName: 'Brightloop Workspace',
                variantName: subscription.variantName,
                quantity: subscription.itemQuantity,
                unitPrice: subscription.variantName === 'Odoo' ? 1059 : productPrice,
                subtotal:
                  subscription.itemQuantity *
                  (subscription.variantName === 'Odoo' ? 1059 : productPrice),
                taxRate,
              },
            },
          },
          update: { status: 'ACTIVE', nextBillingDate: subscription.nextDate },
        });
      }

      const invoiceRows = [
        {
          id: ids.overdueInvoice,
          number: 'INV-DEMO-0001',
          subscriptionId: ids.subscription,
          customerId: ids.customer,
          cycle: new Date('2026-09-01T00:00:00.000Z'),
          issue: new Date('2026-09-01T00:00:00.000Z'),
          due: new Date('2026-10-01T00:00:00.000Z'),
          status: 'CONFIRMED' as const,
          subtotal: standardSubtotal,
          tax: standardTax,
          total: standardTotal,
          paid: 0,
          dueAmount: standardTotal,
          itemQuantity: 1,
          itemUnitPrice: productPrice,
        },
        {
          id: ids.upcomingInvoice,
          number: 'INV-DEMO-0002',
          subscriptionId: ids.subscription2,
          customerId: ids.customer2,
          cycle: new Date('2026-10-01T00:00:00.000Z'),
          issue: new Date('2026-10-01T00:00:00.000Z'),
          due: new Date('2026-11-15T00:00:00.000Z'),
          status: 'CONFIRMED' as const,
          subtotal: odooSubtotal,
          tax: odooTax,
          total: odooTotal,
          paid: 0,
          dueAmount: odooTotal,
          itemQuantity: 3,
          itemUnitPrice: 1059,
        },
        {
          id: ids.paidInvoice,
          number: 'INV-DEMO-0003',
          subscriptionId: ids.subscription3,
          customerId: ids.customer3,
          cycle: new Date('2026-08-01T00:00:00.000Z'),
          issue: new Date('2026-08-01T00:00:00.000Z'),
          due: new Date('2026-08-31T00:00:00.000Z'),
          status: 'PAID' as const,
          subtotal: yearlySubtotal,
          tax: yearlyTax,
          total: yearlyTotal,
          paid: yearlyTotal,
          dueAmount: 0,
          itemQuantity: 5,
          itemUnitPrice: productPrice,
        },
      ];
      for (const invoice of invoiceRows) {
        const planPrice = invoice.subscriptionId === ids.subscription3 ? 9999 : monthlyPlanPrice;
        const itemSubtotal = invoice.subtotal - planPrice;
        const itemTax = invoice.tax - planPrice * (taxRate / 100);
        await tx.invoice.upsert({
          where: { id: invoice.id },
          create: {
            id: invoice.id,
            invoiceNumber: invoice.number,
            subscriptionId: invoice.subscriptionId,
            customerId: invoice.customerId,
            billingCycleDate: invoice.cycle,
            status: invoice.status,
            issueDate: invoice.issue,
            dueDate: invoice.due,
            subtotalAmount: invoice.subtotal,
            taxAmount: invoice.tax,
            totalAmount: invoice.total,
            paidAmount: invoice.paid,
            amountDue: invoice.dueAmount,
            items: {
              create: [
                {
                  itemType: 'PLAN_FEE',
                  description: invoice.subscriptionId === ids.subscription3 ? 'Scale Annual plan' : 'Growth Monthly plan',
                  quantity: 1,
                  unitPrice: planPrice,
                  preTaxAmount: planPrice,
                  taxRate,
                  taxAmount: planPrice * (taxRate / 100),
                  totalAmount: planPrice * (1 + taxRate / 100),
                },
                {
                  itemType: 'PRODUCT',
                  description: 'Brightloop Workspace',
                  quantity: invoice.itemQuantity,
                  unitPrice: invoice.itemUnitPrice,
                  preTaxAmount: itemSubtotal,
                  taxRate,
                  taxAmount: itemTax,
                  totalAmount: itemSubtotal + itemTax,
                },
              ],
            },
          },
          update: {},
        });
      }

      await tx.payment.upsert({
        where: { paymentReference: 'DEMO-BANK-2026-0003' },
        create: {
          id: ids.paidPayment,
          paymentReference: 'DEMO-BANK-2026-0003',
          customerId: ids.customer3,
          paymentMethod: 'BANK_TRANSFER',
          receivedAt: new Date('2026-08-05T10:00:00.000Z'),
          amount: yearlyTotal,
          notes: 'Seeded demo payment record; no live payment was processed.',
          allocations: {
            create: {
              invoiceId: ids.paidInvoice,
              allocatedAmount: yearlyTotal,
            },
          },
        },
        update: {},
      });
    });
  } finally {
    await prisma.$disconnect();
  }
}

seed().catch((error: unknown) => {
  console.error('Demo seed failed', error);
  process.exitCode = 1;
});
