# Brightloop Backend Progress

**Last updated:** 31 October 2026  
**Status:** Billing run and draft invoice engine implemented

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

## 3. Not yet started

No Brightloop business tables, Prisma models, migrations, authentication, or business APIs have been created yet.

## 4. Remaining work

### Phase A — Database and Prisma

- [x] Install and configure Prisma.
- [x] Add backend environment configuration and database connection string.
- [x] Define the core database models, enums, relationships, unique protections, and indexes.
- [x] Run the first Prisma migration; 18 Brightloop tables now exist in PostgreSQL.
- [ ] Add deterministic seed/demo data.

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
- [ ] Password-reset workflow.
- [ ] Customer ownership checks.

### Phase C — Core business modules

- [ ] Catalog and plan management. **In progress**
- [ ] Tax and discount-rule management.
- [ ] Quotation templates.
- [ ] Subscription creation and lifecycle guard:

  ```text
  DRAFT → QUOTATION → CONFIRMED → ACTIVE → CLOSED
  ```

- [x] Finance/Admin billing run with duplicate-invoice protection and atomic billing-date advancement.
- [ ] Invoice lifecycle management.
- [ ] Payment recording and partial-payment allocation.
- [ ] Finance dashboard and overdue-aging endpoints.
- [ ] Audit logs for sensitive actions.

### Phase D — Quality and frontend handoff

- [ ] Unit and integration tests for critical financial workflows.
- [ ] Swagger/OpenAPI documentation at `/docs`.
- [ ] CORS configuration for the frontend team.
- [ ] API request/response examples and frontend integration notes.
- [ ] Demo seed data and hackathon demo script.

## 5. Current implementation checkpoint

The billing engine is implemented. Tax and discount-rule management and invoice lifecycle management remain next.

Billing API:

```text
GET  /api/v1/billing-runs
POST /api/v1/billing-runs  { "billingDate": "YYYY-MM-DD" }
```

Runs are restricted to Admin and Finance staff. Each run creates at most one draft invoice for each active subscription due on or before its billing date, snapshots its plan and item amounts, advances the next billing date in the same database transaction, and is idempotent for a repeated billing date. Month/year advances clamp dates to the last calendar day where needed. Invoice due dates follow `NET_<days>` or `DUE_ON_RECEIPT` payment terms.
