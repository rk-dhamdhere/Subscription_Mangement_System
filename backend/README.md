# Twin Backend

NestJS REST API backed by PostgreSQL and Prisma. See the [project README](../README.md) for setup, demo accounts, Razorpay configuration, and the walkthrough.

## Commands

```bash
npm install
npx prisma migrate dev
npm run db:seed
npm run start:dev
npm test -- --runInBand
npm run build
```

Set `BRIGHTLOOP_DEMO_PASSWORD` before running the deterministic seed. Configure `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` to enable INR checkout in Razorpay test mode.

The API uses the `/api/v1` prefix. Health is available at `/api/v1/health`; OpenAPI is available at `/docs`.
