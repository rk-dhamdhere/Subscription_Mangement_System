# Brightloop Subscription Management Platform

Hackathon project for managing recurring software subscriptions, quotations, automated billing, invoices, and payments.

## Current project progress

The backend foundation and database migrations are complete. Authentication, catalog, quotations, subscription lifecycle, billing, invoices, payments, and finance reporting APIs are implemented.

- NestJS REST API with a health endpoint
- Dockerized PostgreSQL database
- Prisma relational schema and initial migration
- Core entities for users, catalog, plans, subscriptions, billing, invoices, payments, and audit logs
- Authentication, role-based access control, and Admin/Finance billing workflows

See [the backend progress tracker](docs/backend-progress.md) for the implementation roadmap and current status.

## Repository structure

```text
backend/   NestJS API, Prisma schema, migrations, and backend modules
docs/      Project blueprint and implementation progress
frontend/  Next.js landing/demo UI and authenticated role-based workspaces
```

## Frontend integration

The frontend includes password sign-in/reset, role-gated Admin, Sales, Finance, and Customer Portal routes, catalog and subscription views, finance reporting, invoice/payment workflows, and a billing-run preview/execution UI. It keeps the existing dark Twin visual theme and motion design.

The frontend proxies `/api/v1/*` requests to the backend to avoid browser CORS configuration. By default the proxy targets `http://localhost:3000/api/v1`; set `BRIGHTLOOP_API_URL` before starting Next.js if the API uses a different address. The billing preview is a client-side estimate because the backend currently exposes billing execution only.

Start the backend on port `3000`, then run the frontend from `frontend/`:

```bash
corepack pnpm install
corepack pnpm dev
```

If Next.js is already using port `3000`, start it on another port (for example `corepack pnpm dev -- --port 3001`); the API proxy continues to target the backend on port `3000`.

## Local database

PostgreSQL runs through Docker Compose. The local development database is exposed at port `5433`.

```bash
docker compose up -d
```
