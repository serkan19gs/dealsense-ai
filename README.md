# DealSense AI

The AI co-pilot for real estate agents and investors. Analyze deals, score leads, and write listing copy in seconds.

Built with Vite, React, TypeScript, Tailwind CSS, shadcn-ui, Supabase (auth + database + edge functions), Stripe, and the Anthropic Claude API.

## Features

- **Free public analyzer** (`/analyze`) — cap rate, cash flow, and a deal score with no account required. Runs as pure client-side arithmetic (`src/lib/underwriting.ts`), so there is no unauthenticated path to the AI API and nothing to rate-limit.
- **AI Deal Analyzer** — cash flow, cap rate, rent estimate, and a 1–100 investment score for any property.
- **AI Listing Copywriter** — turn bullet points into MLS-ready listing descriptions in your chosen tone.
- **Lead Scorer** — AI reads inquiry notes and scores urgency/intent so you follow up with the right lead first.
- **Deal Pipeline** — a lightweight Kanban CRM to track deals from new lead to close.
- **Personal analytics dashboard** — usage trends and feature breakdown via Recharts.
- **Subscriptions & billing** — Free / Pro / Team plans via Stripe Checkout, enforced by usage limits.

## Tech stack

| Layer      | Choice                                              |
| ---------- | ---------------------------------------------------- |
| Frontend   | Vite + React 18 + TypeScript + Tailwind + shadcn-ui  |
| Backend    | Supabase (Postgres, Auth, Edge Functions)            |
| AI         | Anthropic Claude API (called from edge functions)    |
| Payments   | Stripe Checkout + webhooks                           |
| Analytics  | Custom `events` table + Recharts dashboard           |

## Local development

### 1. Install dependencies

```sh
npm install
```

### 2. Set up Supabase

Create a project at [supabase.com](https://supabase.com), authenticate the CLI
with `npx supabase login`, then run the setup script — it links the project,
applies the schema, sets the function secrets, and deploys all five edge
functions:

```sh
export SUPABASE_PROJECT_REF=your-project-ref
export ANTHROPIC_API_KEY=sk-ant-...
# optional, for billing:
export STRIPE_SECRET_KEY=sk_test_...
export STRIPE_PRICE_PRO=price_...
export STRIPE_PRICE_TEAM=price_...

./scripts/setup-supabase.sh
```

To keep secrets out of your shell history, put them in a gitignored file and
source it instead: `set -a; source .env.deploy; set +a; ./scripts/setup-supabase.sh`

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are injected into edge functions
automatically — you do not set those yourself.

Prefer to run the steps by hand? The script is short and every command in it
(`supabase link`, `db push`, `secrets set`, `functions deploy`) can be copied
out individually. Note that `stripe-webhook` must be deployed with
`--no-verify-jwt`, since Stripe authenticates by signature rather than a
Supabase JWT.

### 2b. Verify the schema without deploying anything

`scripts/test-schema.sh` applies the migration to a throwaway local PostgreSQL
cluster and asserts that the signup trigger provisions a free subscription,
that check/unique constraints reject bad data, that deleting an auth user
cascades, and that RLS actually isolates one user's rows from another's. It
needs no network, no Supabase project, and no credentials:

```sh
./scripts/test-schema.sh
```

Requires PostgreSQL 14+ server binaries locally (`initdb`, `pg_ctl`, `psql`).

### 3. Set up Stripe

1. Create two recurring Products/Prices in the [Stripe dashboard](https://dashboard.stripe.com/products): **Pro** ($49/mo) and **Team** ($199/mo).
2. Copy the price IDs into `STRIPE_PRICE_PRO` / `STRIPE_PRICE_TEAM` above.
3. Add a webhook endpoint pointing at `https://<project-ref>.functions.supabase.co/stripe-webhook`, subscribed to `checkout.session.completed`, `customer.subscription.updated`, and `customer.subscription.deleted`. Copy the signing secret into `STRIPE_WEBHOOK_SECRET`.

### 4. Configure the frontend

```sh
cp .env.example .env
```

Fill in `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` from your Supabase project settings.

### 5. Run it

```sh
npm run dev
```

Visit `http://localhost:8080`.

## Project structure

```
src/
  components/ui/       shadcn-ui primitives
  components/layout/   navbar, footer, dashboard shell, protected route
  components/marketing/hero, features, pricing, CTA sections
  pages/                landing, pricing, auth, dashboard feature pages
  hooks/                useAuth, useSubscription
  lib/                  supabase client, plans config, AI + analytics helpers
supabase/
  migrations/           SQL schema (profiles, subscriptions, deals, leads, analyses, events)
  functions/             edge functions: analyze-deal, generate-listing, score-lead,
                          create-checkout-session, stripe-webhook
```

## Plan limits

Monthly caps live in `supabase/functions/_shared/usage.ts` (`PLAN_LIMITS`) and are
enforced server-side inside each AI edge function — a client cannot bypass them.
`src/lib/plans.ts` holds the marketing copy for the same numbers, and
`src/hooks/useSubscription.tsx` mirrors them for the UI. **All three must be
updated together.**

| Kind            | Free | Pro       | Team      |
| --------------- | ---- | --------- | --------- |
| `deal_analysis` | 3    | unlimited | unlimited |
| `listing_copy`  | 5    | 200       | 200       |
| `lead_score`    | 10   | unlimited | unlimited |

## Known gaps / next steps

Honest list of what is not done:

- **No edge function has ever executed.** The database schema is verified (see `scripts/test-schema.sh`) and the frontend is verified in a browser, but the five edge functions have never run — that requires a real Supabase project, an Anthropic key, and Stripe keys. Treat the AI responses, plan-limit enforcement, Stripe checkout, and the webhook as unverified until you exercise them. The public `/analyze` page is the exception: it has no backend dependency and is proven end-to-end.
- **No in-app usage counter.** Users discover a plan limit by hitting it and getting an error toast. The counts are already queryable from the `analyses` table, so surfacing "2 of 3 used" in the dashboard is a small addition.
- **The Supabase client is untyped.** `src/lib/supabaseClient.ts` drops the `Database` generic because postgrest's select-query parser fights hand-written table types; row types are applied via casts at each call site instead. Fix properly with `supabase gen types typescript --linked > src/types/database.ts`.
- **No automated tests.** `src/lib/underwriting.ts` is pure and the obvious first candidate.
- **Single 1 MB JS bundle.** No route-level code splitting yet; `React.lazy` on the dashboard routes would be the easy win.

## Go-to-market

See [`MARKETING.md`](./MARKETING.md) for the plan to acquire the first 1,000 users.
