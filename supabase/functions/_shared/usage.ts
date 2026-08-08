import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

// Monthly caps per plan, keyed by `analyses.kind`. A kind absent from a plan's
// map is unlimited on that plan. This is the authority for what each tier
// actually gets — keep src/lib/plans.ts marketing copy in sync with it.
const PLAN_LIMITS: Record<string, Record<string, number>> = {
  free: {
    deal_analysis: 3,
    listing_copy: 5,
    lead_score: 10,
  },
  pro: {
    listing_copy: 200,
  },
  team: {
    listing_copy: 200,
  },
};

// Plural nouns so the limit message reads naturally ("limit of 3 deal analyses").
const LIMIT_LABELS: Record<string, string> = {
  deal_analysis: "deal analyses",
  listing_copy: "listing descriptions",
  lead_score: "lead scores",
};

export function serviceClient(): SupabaseClient {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
}

export async function assertWithinPlanLimit(
  client: SupabaseClient,
  userId: string,
  kind: string
) {
  const { data: subscription } = await client
    .from("subscriptions")
    .select("tier")
    .eq("user_id", userId)
    .maybeSingle();

  const tier = subscription?.tier ?? "free";
  const limit = PLAN_LIMITS[tier]?.[kind];
  if (!limit) return;

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const { count } = await client
    .from("analyses")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("kind", kind)
    .gte("created_at", startOfMonth.toISOString());

  if ((count ?? 0) >= limit) {
    const label = LIMIT_LABELS[kind] ?? kind;
    const upgradeHint =
      tier === "free" ? " Upgrade to Pro for more." : " Contact us if you need a higher cap.";
    throw new Error(
      `You've hit your ${tier} plan limit of ${limit} ${label} this month.${upgradeHint}`
    );
  }
}
