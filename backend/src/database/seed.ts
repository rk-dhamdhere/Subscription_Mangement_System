import * as argon2 from 'argon2';
import { PrismaService } from './prisma.service';

const ids = {
  admin: '10000000-0000-4000-8000-000000000001',
  finance: '10000000-0000-4000-8000-000000000002',
  customer: '10000000-0000-4000-8000-000000000003',
  product: '20000000-0000-4000-8000-000000000001',
  variant: '20000000-0000-4000-8000-000000000002',
  plan: '30000000-0000-4000-8000-000000000001',
  template: '40000000-0000-4000-8000-000000000001',
  subscription: '50000000-0000-4000-8000-000000000001',
};

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
  const startDate = new Date('2026-01-01T00:00:00.000Z');
  const nextBillingDate = new Date('2026-11-01T00:00:00.000Z');
  const prisma = new PrismaService();
  await prisma.$connect();

  try {
    await prisma.$transaction(async (tx) => {
      await tx.user.upsert({
        where: { email: 'admin@example.test' },
        create: {
          id: ids.admin,
          email: 'admin@example.test',
          passwordHash,
          firstName: 'Demo',
          lastName: 'Admin',
          role: 'ADMIN',
          staffRole: 'NONE',
        },
        update: { passwordHash, isActive: true },
      });
      await tx.user.upsert({
        where: { email: 'finance@example.test' },
        create: {
          id: ids.finance,
          email: 'finance@example.test',
          passwordHash,
          firstName: 'Demo',
          lastName: 'Finance',
          role: 'STAFF',
          staffRole: 'FINANCE',
        },
        update: { passwordHash, isActive: true, staffRole: 'FINANCE' },
      });
      const customer = await tx.user.upsert({
        where: { email: 'customer@example.test' },
        create: {
          id: ids.customer,
          email: 'customer@example.test',
          passwordHash,
          firstName: 'Demo',
          lastName: 'Customer',
          role: 'CUSTOMER',
          staffRole: 'NONE',
        },
        update: { passwordHash, isActive: true },
      });
      await tx.product.upsert({
        where: { id: ids.product },
        create: {
          id: ids.product,
          name: 'Brightloop Workspace',
          productType: 'SOFTWARE',
          salesPrice: 50,
          costPrice: 10,
          isActive: true,
        },
        update: { isActive: true },
      });
      await tx.productVariant.upsert({
        where: { id: ids.variant },
        create: {
          id: ids.variant,
          productId: ids.product,
          name: 'Professional',
          priceExtra: 0,
          isActive: true,
        },
        update: { isActive: true },
      });
      await tx.plan.upsert({
        where: { id: ids.plan },
        create: {
          id: ids.plan,
          name: 'Demo Monthly',
          billingPeriod: 'MONTHLY',
          price: 100,
          minQuantity: 1,
          startDate,
          isActive: true,
        },
        update: { isActive: true },
      });
      await tx.quotationTemplate.upsert({
        where: { id: ids.template },
        create: {
          id: ids.template,
          name: 'Demo Workspace Quotation',
          planId: ids.plan,
          validityDays: 30,
          items: {
            create: {
              productId: ids.product,
              variantId: ids.variant,
              quantity: 1,
            },
          },
        },
        update: { isActive: true },
      });
      await tx.subscription.upsert({
        where: { id: ids.subscription },
        create: {
          id: ids.subscription,
          subscriptionNumber: 'SUB-DEMO-0001',
          customerId: customer.id,
          planId: ids.plan,
          status: 'ACTIVE',
          startDate,
          expiryDate: new Date('2027-01-01T00:00:00.000Z'),
          nextBillingDate,
          paymentTerms: 'NET_30',
          subtotalAmount: 150,
          totalAmount: 150,
          items: {
            create: {
              productId: ids.product,
              variantId: ids.variant,
              productName: 'Brightloop Workspace',
              variantName: 'Professional',
              quantity: 1,
              unitPrice: 50,
              subtotal: 50,
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
