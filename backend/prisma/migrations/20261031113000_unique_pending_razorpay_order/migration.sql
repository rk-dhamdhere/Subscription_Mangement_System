CREATE UNIQUE INDEX "razorpay_orders_one_pending_per_invoice_key"
ON "razorpay_orders" ("invoice_id")
WHERE "status" = 'PENDING';
