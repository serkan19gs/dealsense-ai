import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/hooks/useAuth";
import type { Subscription } from "@/types/database";

// Mirrors PLAN_LIMITS in supabase/functions/_shared/usage.ts, which is the
// authority — limits are enforced server-side. Keep the two in sync. A kind
// absent from a plan is unlimited on that plan.
const PLAN_LIMITS: Record<string, Record<string, number>> = {
  free: { deal_analysis: 3, listing_copy: 5, lead_score: 10 },
  pro: { listing_copy: 200 },
  team: { listing_copy: 200 },
};

export function useSubscription() {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setSubscription(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    supabase
      .from("subscriptions")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled) {
          setSubscription((data as Subscription) ?? null);
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [user]);

  const tier = subscription?.tier ?? "free";
  const isPro = tier === "pro" || tier === "team";

  return { subscription, tier, isPro, loading, limits: PLAN_LIMITS[tier] ?? {} };
}
