# Brightloop Subscription Management Platform

Hackathon project for managing recurring software subscriptions, quotations, automated billing, invoices, and payments.

## Current backend progress

The backend foundation and first database migration are complete.

- NestJS REST API foundation with a health endpoint
- Dockerized PostgreSQL database
- Prisma relational schema and initial migration
- Core entities for users, catalog, plans, subscriptions, billing, invoices, payments, and audit logs
- Authentication and role-based access-control work in progress

See [the backend progress tracker](docs/backend-progress.md) for the implementation roadmap and current status.

## Repository structure

```text
backend/   NestJS API, Prisma schema, migrations, and backend modules
docs/      Project blueprint and implementation progress
frontend/  Reserved for the frontend team
```

## Local database

PostgreSQL runs through Docker Compose. The local development database is exposed at port `5433`.

```bash
docker compose up -d
```
