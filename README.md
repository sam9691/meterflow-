# MeterFlow

A usage-based API billing and metering platform I built to solve a problem I kept running into — there's no simple, self-hostable way to add usage tracking and billing to your own APIs without paying for expensive third-party services.

Think of it as a lightweight version of what RapidAPI or AWS API Gateway does, but one you actually own and understand.

## What it does

- Proxies API requests through a gateway that validates keys, applies rate limits, and logs every request
- Tracks usage per API key and aggregates it monthly for billing
- Generates invoices based on how many requests were made (free tier, then pay-as-you-go)
- Shows real-time analytics — latency, error rates, top endpoints, request volume
- Sends webhook notifications when usage thresholds are hit or payments go through

## Tech stack

**Backend** — Node.js + Express, MongoDB, Redis (optional), BullMQ for background jobs

**Frontend** — React + Vite, Tailwind CSS, Recharts for charts, Zustand for state, TanStack Query for data fetching

## Getting started

You need Node.js 18+, MongoDB running locally, and optionally Redis (the app works without it, rate limiting just falls back to in-memory).

```bash
# clone the repo
git clone https://github.com/yourusername/meterflow
cd meterflow

# backend
cd backend
cp .env.example .env
# fill in your MongoDB URI and JWT secrets in .env
npm install
npm run dev

# frontend (new terminal)
cd frontend
npm install
npm run dev
```

Backend runs on `http://localhost:5000`, frontend on `http://localhost:5173`.

## Project layout

```
meterflow/
├── backend/
│   └── src/
│       ├── gateways/       # the actual proxy logic — this is the core of the whole thing
│       ├── billing/        # usage aggregation + stripe integration
│       ├── analytics/      # mongodb aggregation pipelines for the dashboard
│       ├── models/         # mongoose schemas
│       ├── controllers/    # route handlers
│       ├── services/       # business logic layer
│       ├── repositories/   # db access layer (keeps controllers clean)
│       ├── middleware/     # auth, rate limiting, tenant isolation
│       ├── queues/         # bullmq jobs for billing
│       └── webhooks/       # webhook delivery with retry
└── frontend/
    └── src/
        ├── pages/          # one file per page
        ├── components/     # shared ui stuff
        ├── hooks/          # react query hooks
        ├── store/          # zustand stores
        └── api/            # axios wrappers
```

## How the gateway works

Every API request goes through `/gateway/:apiId/*`. The flow is:

1. Pull the API key from `X-API-Key` header (or `Authorization: Bearer`)
2. Look it up using a SHA-256 hash (fast), then verify with bcrypt (secure)
3. Check rate limits — 10/min on free, 100/min on pro, 1000/min on enterprise
4. Forward the request to the upstream API using axios
5. Log the request to MongoDB asynchronously (doesn't block the response)
6. Return the proxied response with some extra headers like `X-MeterFlow-Latency`

```bash
curl http://localhost:5000/gateway/<your-api-id>/users \
  -H "X-API-Key: mf_live_yourkey"
```

## API keys

Keys are never stored in plain text. When you create a key:
- A SHA-256 hash is stored for fast lookups
- A bcrypt hash is stored for verification
- A masked version (`mf_live_xxxx****xxxx`) is shown in the UI

The raw key is only shown once at creation time. After that it's gone.

Key format: `mf_live_<random>` for production, `mf_test_<random>` for testing.

## Billing

Three tiers:

| Plan | Requests/month | Rate limit | Price | Overage |
|------|---------------|------------|-------|---------|
| Free | 1,000 | 10/min | $0 | — |
| Pro | 10,000 | 100/min | $29 | $0.50/100 |
| Enterprise | 100,000 | 1,000/min | $199 | $0.10/100 |

On the 1st of each month a BullMQ job runs, counts requests per user, calculates overage, and generates an invoice. Stripe handles the actual payment collection.

## Environment variables

```env
# required
MONGODB_URI=mongodb://localhost:27017/meterflow
JWT_SECRET=something-long-and-random
JWT_REFRESH_SECRET=something-else-long-and-random

# optional — app works without these
REDIS_HOST=localhost
REDIS_PORT=6379
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

## Running with Docker

```bash
docker-compose up -d
```

This starts MongoDB, Redis, the backend, and the frontend behind nginx. App is at `http://localhost`.

## Known issues / TODO

- [ ] Email verification isn't wired up yet (the token generation is there, just need to hook up an SMTP sender)
- [ ] The enterprise plan pricing is hardcoded — should be configurable per customer
- [ ] Webhook retry logic uses setTimeout which won't survive a server restart — should move to a proper queue
- [ ] No pagination on the analytics activity log yet
- [ ] Tests only cover auth and API key generation — need more coverage on the billing logic

## Why I built this

I was working on a side project where I needed to charge users based on how many API calls they made. Stripe Billing can do this but the setup is complex and you're locked in. I wanted something I could run myself, understand completely, and extend without fighting someone else's abstractions.

Took about 3 weeks of evenings and weekends. The gateway proxy part was the trickiest — getting the request forwarding right with proper header handling and timeout management took longer than expected.

## License

MIT
