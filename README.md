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

1. Create a project at [supabase.com](https://supabase.com).
2. Install the [Supabase CLI](https://supabase.com/docs/guides/cli) and link your project:
   ```sh
   supabase link --project-ref your-project-ref
   ```
3. Apply the schema:
   ```sh
   supabase db push
   ```
4. Deploy the edge functions:
   ```sh
   supabase functions deploy analyze-deal generate-listing score-lead create-checkout-session stripe-webhook
   ```
5. Set edge function secrets:
   ```sh
   supabase secrets set \
     ANTHROPIC_API_KEY=sk-ant-... \
     STRIPE_SECRET_KEY=sk_test_... \
     STRIPE_WEBHOOK_SECRET=whsec_... \
     STRIPE_PRICE_PRO=price_... \
     STRIPE_PRICE_TEAM=price_... \
     SITE_URL=http://localhost:8080
   ```
   `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are already available to edge functions by default.

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

- **Nothing has run end-to-end.** The build, typecheck, and lint are green, but no edge function has ever executed — that requires a real Supabase project, an Anthropic key, and Stripe test keys per the setup steps above. Treat the AI and billing paths as unverified until you run them.
- **No in-app usage counter.** Users discover a plan limit by hitting it and getting an error toast. The counts are already queryable from the `analyses` table, so surfacing "2 of 3 used" in the dashboard is a small addition.
- **The Supabase client is untyped.** `src/lib/supabaseClient.ts` drops the `Database` generic because postgrest's select-query parser fights hand-written table types; row types are applied via casts at each call site instead. Fix properly with `supabase gen types typescript --linked > src/types/database.ts`.
- **No automated tests.** `src/lib/underwriting.ts` is pure and the obvious first candidate.
- **Single 1 MB JS bundle.** No route-level code splitting yet; `React.lazy` on the dashboard routes would be the easy win.

## Go-to-market

See [`MARKETING.md`](./MARKETING.md) for the plan to acquire the first 1,000 users.
