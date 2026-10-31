-- CreateEnum
CREATE TYPE "RazorpayOrderStatus" AS ENUM ('PENDING', 'PAID');

-- CreateTable
CREATE TABLE "razorpay_orders" (
    "id" UUID NOT NULL,
    "order_id" VARCHAR(100) NOT NULL,
    "payment_id" VARCHAR(100),
    "invoice_id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "amount_minor" INTEGER NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'INR',
    "status" "RazorpayOrderStatus" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paid_at" TIMESTAMP(3),

    CONSTRAINT "razorpay_orders_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "razorpay_orders_order_id_key" ON "razorpay_orders"("order_id");

-- CreateIndex
CREATE UNIQUE INDEX "razorpay_orders_payment_id_key" ON "razorpay_orders"("payment_id");

-- CreateIndex
CREATE INDEX "razorpay_orders_invoice_id_status_idx" ON "razorpay_orders"("invoice_id", "status");

-- CreateIndex
CREATE INDEX "razorpay_orders_customer_id_created_at_idx" ON "razorpay_orders"("customer_id", "created_at");

-- AddForeignKey
ALTER TABLE "razorpay_orders" ADD CONSTRAINT "razorpay_orders_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "razorpay_orders" ADD CONSTRAINT "razorpay_orders_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
