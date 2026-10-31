<div align="center">

# Brightloop

### Subscription management, from quotation to payment.

An end-to-end subscription platform for managing a product catalog, customer subscriptions, recurring billing, invoices, and payment allocation—with dedicated workspaces for administrators, staff, and customers.

**Built for a hackathon. Designed around real business workflows.**

</div>

---

## At a glance

| Area | Implementation |
|---|---|
| Customer experience | Twin landing page, customer portal, subscription and invoice views |
| Staff experience | Sales lifecycle actions and a Finance dashboard |
| Backend | Versioned REST API built with NestJS and TypeScript |
| Database | PostgreSQL 16, Docker Compose, Prisma ORM and migrations |
| Authentication | JWT bearer tokens, Argon2id password hashing, role-based authorization |
| API documentation | Swagger UI at `/docs` |

## Product capabilities

- **Authentication and access control:** register and sign in; role-aware Admin, Sales, Finance, and Customer experiences; password reset by email.
- **Catalog administration:** manage products, variants, plans, tax rules, discount rules, and quotation templates through the backend API. The current Admin UI displays the catalog.
- **Subscription lifecycle:** create subscriptions or quotations from templates and move them through validated status transitions.
- **Recurring billing:** run billing for a selected date, generate draft invoices, and advance subscription billing dates transactionally.
- **Finance operations:** review dashboard metrics and invoices, confirm draft invoices, record payments, and allocate payments to invoice balances.
- **Customer self-service:** view your own subscriptions and invoice history.
- **Auditability:** record important subscription, invoice, payment, and password-reset actions.

## Architecture

```mermaid
flowchart LR
    Browser["Browser"]
    Next["Next.js App Router<br/>Twin UI + role workspaces"]
    Proxy["Same-origin /api/v1 proxy"]
    API["NestJS REST API<br/>JWT + role guards"]
    Prisma["Prisma ORM"]
    DB[("PostgreSQL 16")]
    Mail["SMTP provider<br/>password reset"]

    Browser --> Next
    Next --> Proxy
    Proxy --> API
    API --> Prisma
    Prisma --> DB
    API -. reset email .-> Mail
```

The backend is the source of truth for authorization, subscription transitions, billing calculations, invoice balances, and payment allocation. The browser sends API requests through the Next.js rewrite, which forwards `/api/v1/*` to the backend without requiring a browser CORS configuration.

### Request flow

1. A user signs in and receives a JWT access token.
2. The frontend stores the session and sends the token as a bearer token on protected API requests.
3. NestJS validates the token and checks the user's role and, where required, staff department.
4. Services apply business rules and persist financial changes using Prisma and PostgreSQL transactions.
5. The frontend displays the result and reports API validation or authorization errors.

## Technology stack

| Layer | Technologies |
|---|---|
| Frontend | Next.js 16 App Router, React 19, TypeScript |
| UI and motion | Tailwind CSS 4, Framer Motion, GSAP, Lucide |
| Backend | NestJS 12, Node.js, TypeScript |
| API validation | `class-validator`, `class-transformer`, NestJS Swagger |
| Authentication | JWT, Passport, Argon2id, NestJS throttling |
| Data access | Prisma 7 |
| Database | PostgreSQL 16 |
| Local infrastructure | Docker Compose |
| Frontend package manager | pnpm |
| Backend package manager | npm |

## Roles and workspaces

| Role | Workspace | Access |
|---|---|---|
| `ADMIN` | `/admin` | Product and plan catalog; administrative operations |
| `STAFF` — `SALES` or `NONE` | `/staff/sales` | Review subscriptions and perform allowed lifecycle transitions |
| `STAFF` — `FINANCE` | `/staff/finance` | Finance dashboard, billing runs, invoices, and payment operations |
| `CUSTOMER` | `/portal` | View the authenticated customer's subscriptions and invoices |

The API enforces authorization independently of frontend route guards. Admins can access finance/billing operations; catalog management and quotation-template administration are Admin-only. Finance and Admin can run billing and manage payments. Customers can only retrieve their own subscriptions and invoices.

## Core workflows

### Quotation to subscription

```text
Admin configures catalog and quotation template
    → Staff creates a quotation for a customer
    → DRAFT → QUOTATION → CONFIRMED → ACTIVE → CLOSED
```

Only valid next transitions are accepted by the API. Subscription totals snapshot the applicable plan, products, taxes, and discount at creation time.

### Recurring billing

```text
Finance selects billing date
    → POST /api/v1/billing-runs
    → Find active subscriptions due on or before that date
    → Create draft invoices and advance billing dates in a transaction
    → Record invoiced/skipped outcomes
```

A billing run is idempotent for a billing date, and database uniqueness protections prevent duplicate invoices for a subscription billing cycle. The Finance UI's **Preview billing** action is a client-side estimate from the subscription list; the API currently does not provide a dry-run endpoint. The execution result from the backend is authoritative.

### Invoice and payment

```text
Draft invoice → Finance confirms invoice → Payment is recorded
    → Payment allocation reduces amount due
    → Fully settled invoice is marked PAID
```

Payments may be partially allocated. The service validates invoice ownership and available balance while recording allocations transactionally.

## Data model

Prisma models the business records and their relationships:

```text
User ── CustomerProfile
  ├── Subscription ── Plan
  │      └── SubscriptionItem ── Product ── ProductVariant
  ├── Invoice ── InvoiceItem
  │      └── PaymentAllocation ── Payment
  ├── BillingRun ── BillingRunItem ── Subscription
  ├── AuditLog
  └── PasswordResetToken

Plan ── QuotationTemplate ── QuotationTemplateItem
TaxRule · DiscountRule
```

Key enums include user/staff roles, billing periods, subscription and invoice statuses, discount types, billing-run statuses, and payment statuses. Database constraints and indexes protect unique identifiers and common lookup paths.

## API overview

The API prefix is `/api/v1`. Protected endpoints require `Authorization: Bearer <access-token>`. Request DTOs are validated globally; Swagger documentation is available at `/docs` when the backend is running.

| Area | Routes |
|---|---|
| Health | `GET /api/v1/health` |
| Authentication | `POST /api/v1/auth/register`, `POST /api/v1/auth/login`, `POST /api/v1/auth/password-reset/request`, `POST /api/v1/auth/password-reset/complete` |
| Catalog (Admin) | `/api/v1/catalog/products`, `/api/v1/catalog/plans`, `/api/v1/catalog/tax-rules`, `/api/v1/catalog/discount-rules` |
| Quotations (Admin) | `/api/v1/quotation-templates` |
| Subscriptions | `GET/POST /api/v1/subscriptions`, `GET /api/v1/subscriptions/:id`, `POST /api/v1/subscriptions/from-template`, `PATCH /api/v1/subscriptions/:id/status` |
| Billing (Admin/Finance) | `GET/POST /api/v1/billing-runs` |
| Invoices | `GET /api/v1/invoices`, `GET /api/v1/invoices/:id`, `PATCH /api/v1/invoices/:id/status` |
| Payments (Admin/Finance) | `GET/POST /api/v1/payments` |
| Finance (Admin/Finance) | `GET /api/v1/finance/dashboard`, `GET /api/v1/finance/receivables/aging` |

See the live Swagger documentation for DTOs, request bodies, response schemas, and authorization details.

## Run locally

### Prerequisites

- Node.js compatible with the repository dependencies
- npm and Corepack (for pnpm)
- Docker Desktop or Docker Engine with Docker Compose

### 1. Start PostgreSQL

From the repository root:

```bash
docker compose up -d
```

PostgreSQL is available on `127.0.0.1:5433`. Docker Compose creates the local `brightloop_db` database and `brightloop_user` account.

### 2. Configure and run the backend

In a terminal:

```bash
cd backend
npm ci
```

Copy `backend/.env.example` to `backend/.env` and set at least:

```dotenv
DATABASE_URL="postgresql://brightloop_user:brightloop_password@127.0.0.1:5433/brightloop_db?schema=public"
PORT=3000
JWT_SECRET="replace-with-a-long-random-secret"
```

Apply migrations, generate the Prisma client, and start the API:

```bash
npx prisma migrate deploy
npx prisma generate
npm run start:dev
```

Verify the API at `http://localhost:3000/api/v1/health`; open Swagger at `http://localhost:3000/docs`.

### 3. (Optional) Seed demo data

Set `BRIGHTLOOP_DEMO_PASSWORD` in `backend/.env` to a password of at least 12 characters, then run:

```bash
npm run db:seed
```

The seed creates these demo accounts, all using the configured demo password:

| Role | Email |
|---|---|
| Admin | `admin@example.test` |
| Finance staff | `finance@example.test` |
| Customer | `customer@example.test` |

The seed is explicit and is not run automatically.

### 4. Run the frontend

In another terminal:

```bash
cd frontend
corepack pnpm install --frozen-lockfile
corepack pnpm dev --port 3001
```

Open `http://localhost:3001`. By default the Next.js API proxy forwards to `http://localhost:3000/api/v1`. To use another backend address, set `BRIGHTLOOP_API_URL` before starting Next.js, for example:

```dotenv
BRIGHTLOOP_API_URL=http://localhost:4000/api/v1
```

The frontend's `/api/v1` proxy path is retained; the configured URL should include the backend `/api/v1` prefix.

### Password reset email

Configure `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `MAIL_FROM`, and `FRONTEND_URL` in `backend/.env` to deliver reset emails. Without a working SMTP configuration, the password-reset request cannot deliver a token.

## Development and quality checks

Run backend commands from `backend/`:

```bash
npm run build
npm test
npm run lint
```

Run frontend checks from `frontend/`:

```bash
corepack pnpm build
```

## Repository layout

```text
backend/
  prisma/             Prisma schema and database migrations
  src/auth/           Login, JWT, role guards, and password reset
  src/catalog/        Products, plans, tax, and discounts
  src/quotations/     Quotation templates
  src/subscriptions/  Subscription creation and lifecycle
  src/billing/        Billing runs and invoice operations
  src/payments/       Payment recording and allocation
  src/finance/        Finance dashboard and receivables
  test/               API end-to-end tests
frontend/
  app/                Landing page and role-based App Router pages
  components/         Shared workspace, lifecycle, and finance UI
  services/           API client
  store/              Persisted authentication state
  types/              Frontend API contracts
docs/                 Project notes
docker-compose.yml    Local PostgreSQL service
```

## Project notes

- The frontend and backend API are integrated for the currently implemented routes.
- The billing preview is an estimate; use the billing run response for actual outcomes.
- Staff management, subscription creation forms, quotation building UI, and customer payment history are not currently exposed as frontend workflows.
- The password-reset API requires SMTP configuration to send reset instructions.

---

<div align="center">

**Brightloop — one place for the subscription lifecycle.**

</div>
