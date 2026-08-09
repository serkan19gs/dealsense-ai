#!/usr/bin/env bash
#
# Applies the schema and deploys the edge functions to a Supabase project.
#
# Run this from your own machine — it needs network access to supabase.com.
#
#   1. Create a project at https://supabase.com/dashboard (any region/plan).
#   2. Authenticate the CLI:  npx supabase login
#   3. Export the values below, then run:  ./scripts/setup-supabase.sh
#
# Secrets are read from the environment and never printed. To keep them out of
# your shell history, put them in a local file and `source` it:
#
#   set -a; source .env.deploy; set +a; ./scripts/setup-supabase.sh
#
# Required:
#   SUPABASE_PROJECT_REF   Project ref from the dashboard URL / Project Settings
#   ANTHROPIC_API_KEY      https://console.anthropic.com/settings/keys
#
# Optional — omit to deploy without billing; checkout stays inert until set:
#   STRIPE_SECRET_KEY      sk_test_... or sk_live_...
#   STRIPE_WEBHOOK_SECRET  whsec_... (from the webhook endpoint you create)
#   STRIPE_PRICE_PRO       price_... for the $49/mo product
#   STRIPE_PRICE_TEAM      price_... for the $199/mo product
#   SITE_URL               Deployed origin; defaults to http://localhost:8080

set -euo pipefail
cd "$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

SUPABASE="${SUPABASE_BIN:-npx --yes supabase@latest}"

missing=()
[ -n "${SUPABASE_PROJECT_REF:-}" ] || missing+=("SUPABASE_PROJECT_REF")
[ -n "${ANTHROPIC_API_KEY:-}" ]    || missing+=("ANTHROPIC_API_KEY")
if [ ${#missing[@]} -gt 0 ]; then
  echo "error: missing required environment variable(s): ${missing[*]}" >&2
  echo "see the header of this script for where to get each one." >&2
  exit 1
fi

SITE_URL="${SITE_URL:-http://localhost:8080}"

echo "==> linking project $SUPABASE_PROJECT_REF"
$SUPABASE link --project-ref "$SUPABASE_PROJECT_REF"

echo "==> applying migrations (creates tables, RLS policies, signup trigger)"
$SUPABASE db push

echo "==> setting edge function secrets"
secret_args=(
  "ANTHROPIC_API_KEY=$ANTHROPIC_API_KEY"
  "SITE_URL=$SITE_URL"
)
for name in STRIPE_SECRET_KEY STRIPE_WEBHOOK_SECRET STRIPE_PRICE_PRO STRIPE_PRICE_TEAM; do
  value="${!name:-}"
  [ -n "$value" ] && secret_args+=("$name=$value")
done
$SUPABASE secrets set "${secret_args[@]}" >/dev/null
echo "    set: ANTHROPIC_API_KEY, SITE_URL$(
  for n in STRIPE_SECRET_KEY STRIPE_WEBHOOK_SECRET STRIPE_PRICE_PRO STRIPE_PRICE_TEAM; do
    [ -n "${!n:-}" ] && printf ', %s' "$n"
  done
)"

echo "==> deploying edge functions"
# stripe-webhook is deployed with --no-verify-jwt: Stripe calls it directly and
# authenticates with a signature, not a Supabase JWT.
for fn in analyze-deal generate-listing score-lead create-checkout-session; do
  echo "    - $fn"
  $SUPABASE functions deploy "$fn"
done
echo "    - stripe-webhook (no JWT verification)"
$SUPABASE functions deploy stripe-webhook --no-verify-jwt

cat <<EOF

==> done

Next:

  1. Point the frontend at the project. In .env:
       VITE_SUPABASE_URL=https://$SUPABASE_PROJECT_REF.supabase.co
       VITE_SUPABASE_ANON_KEY=<anon key from Project Settings > API>

  2. If you configured Stripe, add a webhook endpoint at
       https://$SUPABASE_PROJECT_REF.functions.supabase.co/stripe-webhook
     subscribed to:
       checkout.session.completed
       customer.subscription.updated
       customer.subscription.deleted
     then re-run this script with STRIPE_WEBHOOK_SECRET set to its signing secret.

  3. Smoke test, in order:
       - npm run dev, sign up, then confirm a row appears in the
         subscriptions table with tier = 'free' (proves auth + trigger).
       - Run a deal analysis (proves the Anthropic key and analyze-deal).
       - Run 4 analyses on the free plan; the 4th must be refused
         (proves server-side plan limits).

  Tail logs while testing:  $SUPABASE functions logs analyze-deal --tail
EOF
