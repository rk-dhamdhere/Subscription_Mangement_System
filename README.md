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
frontend/  Next.js landing/demo UI (not connected to the backend yet)
```

## Local database

PostgreSQL runs through Docker Compose. The local development database is exposed at port `5433`.

```bash
docker compose up -d
```
