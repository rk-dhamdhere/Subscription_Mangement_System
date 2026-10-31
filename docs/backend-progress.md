# Brightloop Backend Progress

**Last updated:** 31 October 2026  
**Status:** Backend-only business workflows implemented; frontend connection remains deferred

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
- [x] Run Prisma migrations; 19 Brightloop tables now exist in PostgreSQL.
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
- [x] Invoice listing and Admin/Finance draft confirmation/cancellation with transactional audit records.
- [x] Payment recording and partial/full invoice allocation.
- [x] Finance dashboard and receivables aging endpoints.
- [x] Audit logs for invoice, subscription, payment, and password-reset actions.

### Phase D — Quality and frontend handoff

- [x] Focused unit tests for authentication, subscriptions, billing, invoices, payments, and finance reports.
- [x] Swagger/OpenAPI documentation at `/docs`.
- [ ] CORS configuration for the frontend team.
- [ ] API request/response examples and frontend integration notes.
- [x] Deterministic demo seed data.

## 4. Current implementation checkpoint

Core backend business and financial APIs are implemented. Frontend API wiring, CORS allowlist configuration, and end-to-end testing against connected frontend flows remain.

Catalog APIs are Admin-only and cover products, product variants, plans, tax rules, and discount rules. Subscription prices snapshot the effective tax rules and any redeemed discount; recurring invoices use those snapshots and include tax/discount line items.

The demo seed creates Admin, Finance, and Customer accounts plus a product, variant, plan, quotation template, and active subscription. It is deterministic and requires `BRIGHTLOOP_DEMO_PASSWORD`; it is not run automatically.

Billing API:

```text
GET  /api/v1/billing-runs
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

Configure `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `MAIL_FROM`, and `FRONTEND_URL` before using password-reset email delivery. Demo accounts/data are created with `npm run db:seed` only after setting `BRIGHTLOOP_DEMO_PASSWORD` to a password of at least 12 characters.

The reset email points to `${FRONTEND_URL}/reset-password`; the frontend reset page and API integration are not implemented yet. CORS is intentionally not enabled until the frontend origin is known.
