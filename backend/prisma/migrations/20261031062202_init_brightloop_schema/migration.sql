-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'STAFF', 'CUSTOMER');

-- CreateEnum
CREATE TYPE "StaffRole" AS ENUM ('SALES', 'FINANCE', 'NONE');

-- CreateEnum
CREATE TYPE "BillingPeriod" AS ENUM ('DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('DRAFT', 'QUOTATION', 'CONFIRMED', 'ACTIVE', 'CLOSED');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('DRAFT', 'CONFIRMED', 'PAID', 'CANCELLED');

-- CreateEnum
CREATE TYPE "DiscountType" AS ENUM ('FIXED', 'PERCENTAGE');

-- CreateEnum
CREATE TYPE "BillingRunStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "BillingOutcome" AS ENUM ('INVOICED', 'SKIPPED', 'FAILED');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('POSTED', 'VOIDED');

-- CreateEnum
CREATE TYPE "InvoiceItemType" AS ENUM ('PRODUCT', 'PLAN_FEE', 'DISCOUNT', 'ADJUSTMENT');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "first_name" VARCHAR(100) NOT NULL,
    "last_name" VARCHAR(100) NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'CUSTOMER',
    "staff_role" "StaffRole" NOT NULL DEFAULT 'NONE',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_profiles" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "legal_name" TEXT,
    "billing_email" TEXT,
    "phone" TEXT,
    "billing_address" TEXT,
    "tax_identifier" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customer_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "product_type" TEXT NOT NULL,
    "sales_price" DECIMAL(14,2) NOT NULL,
    "cost_price" DECIMAL(14,2) NOT NULL,
    "notes" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_variants" (
    "id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "price_extra" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "product_variants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plans" (
    "id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "billing_period" "BillingPeriod" NOT NULL,
    "price" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "min_quantity" INTEGER NOT NULL DEFAULT 1,
    "start_date" DATE NOT NULL,
    "end_date" DATE,
    "auto_close" BOOLEAN NOT NULL DEFAULT false,
    "can_pause" BOOLEAN NOT NULL DEFAULT true,
    "can_renew" BOOLEAN NOT NULL DEFAULT true,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quotation_templates" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "plan_id" UUID NOT NULL,
    "validity_days" INTEGER NOT NULL DEFAULT 30,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "quotation_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quotation_template_items" (
    "id" UUID NOT NULL,
    "template_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "variant_id" UUID,
    "quantity" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "quotation_template_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscriptions" (
    "id" UUID NOT NULL,
    "subscription_number" TEXT NOT NULL,
    "customer_id" UUID NOT NULL,
    "plan_id" UUID NOT NULL,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'DRAFT',
    "quotation_expires_at" DATE,
    "start_date" DATE NOT NULL,
    "expiry_date" DATE NOT NULL,
    "next_billing_date" DATE NOT NULL,
    "payment_terms" TEXT NOT NULL DEFAULT 'NET_30',
    "subtotal_amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "tax_amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "discount_amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "total_amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscription_items" (
    "id" UUID NOT NULL,
    "subscription_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "variant_id" UUID,
    "product_name" TEXT NOT NULL,
    "variant_name" TEXT,
    "quantity" INTEGER NOT NULL,
    "unit_price" DECIMAL(14,2) NOT NULL,
    "tax_rate" DECIMAL(7,4) NOT NULL DEFAULT 0,
    "subtotal" DECIMAL(14,2) NOT NULL,

    CONSTRAINT "subscription_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tax_rules" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "rate_percentage" DECIMAL(7,4) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "effective_from" DATE NOT NULL,
    "effective_until" DATE,

    CONSTRAINT "tax_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "discount_rules" (
    "id" UUID NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "discount_type" "DiscountType" NOT NULL,
    "value" DECIMAL(14,2) NOT NULL,
    "min_purchase_amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "min_quantity" INTEGER NOT NULL DEFAULT 0,
    "max_uses" INTEGER,
    "current_uses" INTEGER NOT NULL DEFAULT 0,
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "discount_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "billing_runs" (
    "id" UUID NOT NULL,
    "billing_date" DATE NOT NULL,
    "status" "BillingRunStatus" NOT NULL DEFAULT 'PENDING',
    "initiated_by_id" UUID,
    "started_at" TIMESTAMP(3),
    "finished_at" TIMESTAMP(3),
    "candidate_count" INTEGER NOT NULL DEFAULT 0,
    "invoiced_count" INTEGER NOT NULL DEFAULT 0,
    "skipped_count" INTEGER NOT NULL DEFAULT 0,
    "failed_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "billing_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "billing_run_items" (
    "id" UUID NOT NULL,
    "billing_run_id" UUID NOT NULL,
    "subscription_id" UUID NOT NULL,
    "outcome" "BillingOutcome" NOT NULL,
    "message" TEXT,

    CONSTRAINT "billing_run_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoices" (
    "id" UUID NOT NULL,
    "invoice_number" TEXT NOT NULL,
    "billing_run_id" UUID,
    "subscription_id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "billing_cycle_date" DATE NOT NULL,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'DRAFT',
    "issue_date" DATE NOT NULL,
    "due_date" DATE NOT NULL,
    "subtotal_amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "tax_amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "discount_amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "total_amount" DECIMAL(14,2) NOT NULL,
    "paid_amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "amount_due" DECIMAL(14,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoice_items" (
    "id" UUID NOT NULL,
    "invoice_id" UUID NOT NULL,
    "subscription_item_id" UUID,
    "item_type" "InvoiceItemType" NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unit_price" DECIMAL(14,2) NOT NULL,
    "pre_tax_amount" DECIMAL(14,2) NOT NULL,
    "tax_rate" DECIMAL(7,4) NOT NULL DEFAULT 0,
    "tax_amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "total_amount" DECIMAL(14,2) NOT NULL,

    CONSTRAINT "invoice_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" UUID NOT NULL,
    "payment_reference" TEXT NOT NULL,
    "customer_id" UUID NOT NULL,
    "payment_method" TEXT NOT NULL,
    "received_at" TIMESTAMP(3) NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'POSTED',
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_allocations" (
    "id" UUID NOT NULL,
    "payment_id" UUID NOT NULL,
    "invoice_id" UUID NOT NULL,
    "allocated_amount" DECIMAL(14,2) NOT NULL,

    CONSTRAINT "payment_allocations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL,
    "actor_id" UUID,
    "action" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" UUID NOT NULL,
    "before_data" JSONB,
    "after_data" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "customer_profiles_user_id_key" ON "customer_profiles"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "product_variants_product_id_name_key" ON "product_variants"("product_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "subscriptions_subscription_number_key" ON "subscriptions"("subscription_number");

-- CreateIndex
CREATE INDEX "subscriptions_customer_id_idx" ON "subscriptions"("customer_id");

-- CreateIndex
CREATE INDEX "subscriptions_status_next_billing_date_idx" ON "subscriptions"("status", "next_billing_date");

-- CreateIndex
CREATE UNIQUE INDEX "discount_rules_code_key" ON "discount_rules"("code");

-- CreateIndex
CREATE UNIQUE INDEX "billing_runs_billing_date_key" ON "billing_runs"("billing_date");

-- CreateIndex
CREATE UNIQUE INDEX "billing_run_items_billing_run_id_subscription_id_key" ON "billing_run_items"("billing_run_id", "subscription_id");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_invoice_number_key" ON "invoices"("invoice_number");

-- CreateIndex
CREATE INDEX "invoices_status_due_date_idx" ON "invoices"("status", "due_date");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_subscription_id_billing_cycle_date_key" ON "invoices"("subscription_id", "billing_cycle_date");

-- CreateIndex
CREATE UNIQUE INDEX "payments_payment_reference_key" ON "payments"("payment_reference");

-- CreateIndex
CREATE UNIQUE INDEX "payment_allocations_payment_id_invoice_id_key" ON "payment_allocations"("payment_id", "invoice_id");

-- CreateIndex
CREATE INDEX "audit_logs_entity_type_entity_id_created_at_idx" ON "audit_logs"("entity_type", "entity_id", "created_at");

-- AddForeignKey
ALTER TABLE "customer_profiles" ADD CONSTRAINT "customer_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quotation_templates" ADD CONSTRAINT "quotation_templates_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quotation_template_items" ADD CONSTRAINT "quotation_template_items_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "quotation_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quotation_template_items" ADD CONSTRAINT "quotation_template_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quotation_template_items" ADD CONSTRAINT "quotation_template_items_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "product_variants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_items" ADD CONSTRAINT "subscription_items_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "subscriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_items" ADD CONSTRAINT "subscription_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_items" ADD CONSTRAINT "subscription_items_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "product_variants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing_runs" ADD CONSTRAINT "billing_runs_initiated_by_id_fkey" FOREIGN KEY ("initiated_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing_run_items" ADD CONSTRAINT "billing_run_items_billing_run_id_fkey" FOREIGN KEY ("billing_run_id") REFERENCES "billing_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing_run_items" ADD CONSTRAINT "billing_run_items_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "subscriptions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_billing_run_id_fkey" FOREIGN KEY ("billing_run_id") REFERENCES "billing_runs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "subscriptions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_items" ADD CONSTRAINT "invoice_items_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_items" ADD CONSTRAINT "invoice_items_subscription_item_id_fkey" FOREIGN KEY ("subscription_item_id") REFERENCES "subscription_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_allocations" ADD CONSTRAINT "payment_allocations_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_allocations" ADD CONSTRAINT "payment_allocations_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
