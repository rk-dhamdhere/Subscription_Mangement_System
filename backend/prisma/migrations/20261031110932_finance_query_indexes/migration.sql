-- CreateIndex
CREATE INDEX "invoices_issue_date_idx" ON "invoices"("issue_date");

-- CreateIndex
CREATE INDEX "invoices_customer_id_issue_date_idx" ON "invoices"("customer_id", "issue_date");

-- CreateIndex
CREATE INDEX "payments_status_received_at_idx" ON "payments"("status", "received_at");

-- CreateIndex
CREATE INDEX "subscriptions_created_at_idx" ON "subscriptions"("created_at");
