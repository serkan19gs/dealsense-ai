import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { supabase } from "@/lib/supabaseClient";
import { PLANS } from "@/lib/plans";

export default function SettingsPage() {
  const { user } = useAuth();
  const { tier, subscription } = useSubscription();
  const [searchParams] = useSearchParams();
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const suggestedUpgrade = searchParams.get("upgrade");

  async function startCheckout(planId: "pro" | "team") {
    setCheckoutLoading(planId);
    try {
      const { data, error } = await supabase.functions.invoke<{ url: string }>("create-checkout-session", {
        body: { plan: planId },
      });
      if (error) throw new Error(error.message);
      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not start checkout.");
    } finally {
      setCheckoutLoading(null);
    }
  }

  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">Manage your account and subscription.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Account</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>
            <span className="text-muted-foreground">Email: </span>
            {user?.email}
          </p>
          <p>
            <span className="text-muted-foreground">Plan: </span>
            <Badge className="ml-1 capitalize">{tier}</Badge>
          </p>
          {subscription?.current_period_end && (
            <p>
              <span className="text-muted-foreground">Renews: </span>
              {new Date(subscription.current_period_end).toLocaleDateString()}
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Upgrade your plan</CardTitle>
          <CardDescription>Unlock unlimited AI analyses and team features.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {PLANS.filter((p) => p.id !== "free").map((plan) => (
            <div
              key={plan.id}
              className="flex items-center justify-between rounded-md border p-4"
            >
              <div>
                <p className="font-medium">
                  {plan.name}{" "}
                  {suggestedUpgrade === plan.id && <Badge variant="outline">Suggested</Badge>}
                </p>
                <p className="text-sm text-muted-foreground">
                  ${plan.price}
                  {plan.priceSuffix} · {plan.seats}
                </p>
              </div>
              <Button
                onClick={() => startCheckout(plan.id as "pro" | "team")}
                disabled={tier === plan.id || checkoutLoading === plan.id}
              >
                {tier === plan.id ? "Current plan" : checkoutLoading === plan.id ? "Redirecting…" : "Upgrade"}
              </Button>
            </div>
          ))}
        </CardContent>
        <CardFooter>
          <p className="text-xs text-muted-foreground">
            Payments are processed securely by Stripe. Cancel anytime from the billing portal.
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
