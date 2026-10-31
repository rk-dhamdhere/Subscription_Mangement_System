# Brightloop Backend Progress

**Last updated:** 31 October 2026  
**Status:** Core backend, customer registration, demo workspaces, and Razorpay test checkout integrated

## 1. Backend goal

Build a secure, transaction-safe backend for the Brightloop Subscription Management Platform. It will provide REST APIs for the future frontend and handle:

- user authentication and role-based access;
- products, variants, plans, tax rules, and discount rules;
- quotation-to-subscription lifecycle management;
- automated recurring billing and invoices;
- partial/full payments and receivables;
- finance dashboard analytics and audit history.

The backend uses **NestJS**, **PostgreSQL in Docker**, and **Prisma**. PostgreSQL is the source of truth for all financial records; future tools such as n8n may automate notifications but will not calculate or write billing records directly.

## 2. Completed work

### Infrastructure

- [x] Repository backend folder structure created.
- [x] Docker Compose configuration created for PostgreSQL 16.
- [x] PostgreSQL container created and verified healthy.
- [x] Local database created: `brightloop_db`.
- [x] Database accessible through pgAdmin on host `127.0.0.1`, port `5433`.

### NestJS backend foundation

- [x] NestJS project initialized in `backend/`.
- [x] TypeScript build configuration added and verified.
- [x] Standard dependency lockfile generated.
- [x] Global API prefix configured: `/api/v1`.
- [x] Global request validation enabled.
- [x] Health endpoint added and verified:

  ```text
  GET /api/v1/health
  ```

- [x] Backend compiles successfully.
- [x] Local health response verified:

  ```json
  { "status": "ok", "service": "brightloop-backend" }
  ```

## 3. Remaining work

### Phase A — Database and Prisma

- [x] Install and configure Prisma.
- [x] Add backend environment configuration and database connection string.
- [x] Define the core database models, enums, relationships, unique protections, and indexes.
- [x] Run Prisma migrations; the business schema includes payment orders for verified Razorpay checkout.
- [x] Add deterministic seed/demo data.

Main planned entities:

```text
Users and customer profiles
Products and product variants
Plans
Quotation templates and items
Subscriptions and subscription items
Tax and discount rules
Billing runs and billing-run items
Invoices and invoice items
Payments and payment allocations
Audit logs
Password reset tokens
```

### Phase B — Security

- [x] Password hashing with Argon2id and password-complexity policy.
- [x] Customer registration, login, and JWT authentication.
- [x] Customer signup enforces a password longer than eight characters with uppercase, lowercase, and special characters.
- [x] JWT bearer-token validation and public-route protection.
- [x] Reusable Admin/Sales/Finance/Customer role guard.
- [x] Registration and login verified live against PostgreSQL.
- [x] Expiring, single-use password-reset workflow with hashed tokens and SMTP delivery.
- [x] Customer ownership checks for subscription and invoice reads.

### Phase C — Core business modules

- [x] Catalog and plan management.
- [x] Tax and discount-rule management.
- [x] Quotation templates and subscription quotation creation.
- [x] Subscription creation and lifecycle guard:

  ```text
  DRAFT → QUOTATION → CONFIRMED → ACTIVE → CLOSED
  ```

- [x] Finance/Admin billing run with duplicate-invoice protection and atomic billing-date advancement.
- [x] Finance/Admin read-only billing preview using the execution invoice-total calculation.
- [x] Admin staff account creation, role assignment, deactivation, and reactivation APIs.
- [x] Invoice listing and Admin/Finance draft confirmation/cancellation with transactional audit records.
- [x] Payment recording and partial/full invoice allocation.
- [x] Razorpay INR order creation and server-side signature/capture verification for customer-owned invoices.
- [x] Signed `payment.captured` webhook recovery and idempotent settlement.
- [x] Customer self-service pause/resume, early close, and renewal draft workflows controlled by each plan.
- [x] Sales customer search, quotation-template selection, and quotation creation.
- [x] Admin product, variant, plan, tax, discount, and quotation-template creation UI.
- [x] Finance invoice confirmation/cancellation, invoice email, print view, search, and receivables aging.
- [x] Finance dashboard and receivables aging endpoints.
- [x] Audit logs for invoice, subscription, payment, and password-reset actions.

### Phase D — Quality and frontend handoff

- [x] Focused unit tests for authentication, subscriptions, billing, invoices, payments, and finance reports.
- [x] Swagger/OpenAPI documentation at `/docs`.
- [ ] CORS configuration for the frontend team.
- [x] API request/response examples and initial frontend integration notes.
- [x] Deterministic demo seed data.
- [x] Demo seed includes two admins, multiple staff roles, three customers, and representative invoice/payment states.

## 4. Current implementation checkpoint

Core backend business and financial APIs are implemented. The frontend provides customer registration and portal checkout, role-gated workspaces, backend billing preview, and Admin staff management. CORS is intentionally not enabled because the Next.js frontend proxies API requests.

Catalog APIs are Admin-only and cover products, product variants, plans, tax rules, and discount rules. Subscription prices snapshot the effective tax rules and any redeemed discount; recurring invoices use those snapshots and include tax/discount line items.

The deterministic demo seed creates two Admin accounts, Finance/Sales/General staff, and three Customer accounts, plus monthly and annual plans, a product variant, a limited-use discount, tax, a quotation template, active subscriptions, overdue/upcoming/paid invoices, and a sample bank-transfer payment. It requires `BRIGHTLOOP_DEMO_PASSWORD` and is not run automatically.

Billing preview and execution share the backend invoice-total calculation. Preview is read-only and reports candidate subscriptions, expected skips, cycle dates, and projected totals. It is a point-in-time estimate; execution can differ if subscription data changes before the run.

Admin staff management is available at `GET`/`POST /api/v1/staff` and `PATCH /api/v1/staff/:id`. Admins can provision Sales or Finance accounts, change their workspace role, and deactivate/reactivate accounts. Staff changes are audited; passwords are hashed and never returned.

Billing API:

```text
GET  /api/v1/billing-runs
POST /api/v1/billing-runs/preview  { "billingDate": "YYYY-MM-DD" }
POST /api/v1/billing-runs  { "billingDate": "YYYY-MM-DD" }
```

Runs are restricted to Admin and Finance staff. Each run creates at most one draft invoice for each active subscription due on or before its billing date, snapshots its plan and item amounts, advances the next billing date in the same database transaction, and is idempotent for a repeated billing date. Month/year advances clamp dates to the last calendar day where needed. Invoice due dates follow `NET_<days>` or `DUE_ON_RECEIPT` payment terms.

Invoice API:

```text
GET   /api/v1/invoices
GET   /api/v1/invoices/:id
PATCH /api/v1/invoices/:id/status  { "status": "CONFIRMED" | "CANCELLED" }
```

Only draft invoices can be confirmed or cancelled. Paid status is reserved for payment allocation, and status changes are conditional and audited in a transaction.

Quotation templates are managed at `/api/v1/quotation-templates` (Admin only). `POST /api/v1/subscriptions/from-template` creates a quotation with the template's plan, items, and validity period.

Staff customer lookup is available at `GET /api/v1/customers?search=<term>`; results are limited to active customer accounts. Sales can read active quotation templates and create customer quotations from them.

Subscription transitions include `ACTIVE → PAUSED → ACTIVE`, plus early closure when the plan permits it. Customers can pause, resume, close early, and create a renewal draft only for their own subscriptions. Plan settings control pausing, early closure, renewal, and automatic closure at expiry.

Finance can email confirmed/paid invoices using `POST /api/v1/invoices/:id/email` when SMTP is configured. The frontend invoice detail route provides a print-friendly view.

Payments and finance API:

```text
GET  /api/v1/payments
POST /api/v1/payments
GET  /api/v1/finance/dashboard
GET  /api/v1/finance/receivables/aging
```

Password reset:

```text
POST /api/v1/auth/password-reset/request
POST /api/v1/auth/password-reset/complete
```

Razorpay checkout:

```text
POST /api/v1/payments/razorpay/orders  { "invoiceId": "<uuid>" }
POST /api/v1/payments/razorpay/verify  { "razorpay_order_id": "...", "razorpay_payment_id": "...", "razorpay_signature": "..." }
POST /api/v1/payments/razorpay/webhook (Razorpay payment.captured event)
```

Checkout is Customer-only, INR-only, and limited to the caller's confirmed invoice. The backend verifies Razorpay's HMAC signature and confirms captured amount/currency/order with Razorpay before atomically recording payment allocation and invoice status. The signed `payment.captured` webhook uses the same settlement path for callback recovery. Configure `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, and `RAZORPAY_WEBHOOK_SECRET`; without them the rest of the app works and checkout reports that online payments are not configured. Never expose these secrets in frontend environment variables.

Configure `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `MAIL_FROM`, and `FRONTEND_URL` before using password-reset email delivery. Demo accounts/data are created with `npm run db:seed` only after setting `BRIGHTLOOP_DEMO_PASSWORD` to a password of at least 12 characters.

The reset email points to `${FRONTEND_URL}/reset-password`; the frontend reset page is available. CORS is intentionally not enabled because the Next.js frontend proxies `/api/v1` requests to the backend.
