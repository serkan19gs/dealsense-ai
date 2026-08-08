import Stripe from "https://esm.sh/stripe@16?target=deno";
import { corsHeaders } from "../_shared/cors.ts";
import { serviceClient } from "../_shared/usage.ts";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2024-06-20",
});

const PRICE_IDS: Record<string, string | undefined> = {
  pro: Deno.env.get("STRIPE_PRICE_PRO"),
  team: Deno.env.get("STRIPE_PRICE_TEAM"),
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing Authorization header.");

    const client = serviceClient();
    const {
      data: { user },
    } = await client.auth.getUser(authHeader.replace("Bearer ", ""));
    if (!user?.email) throw new Error("Not authenticated.");

    const { plan } = await req.json();
    const priceId = PRICE_IDS[plan];
    if (!priceId) throw new Error(`Unknown or unconfigured plan: ${plan}`);

    const { data: existing } = await client
      .from("subscriptions")
      .select("stripe_customer_id")
      .eq("user_id", user.id)
      .maybeSingle();

    let customerId = existing?.stripe_customer_id ?? undefined;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { supabase_user_id: user.id },
      });
      customerId = customer.id;
      await client
        .from("subscriptions")
        .update({ stripe_customer_id: customerId })
        .eq("user_id", user.id);
    }

    const siteUrl = Deno.env.get("SITE_URL") ?? "http://localhost:8080";

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${siteUrl}/app/settings?checkout=success`,
      cancel_url: `${siteUrl}/app/settings?checkout=cancelled`,
      metadata: { supabase_user_id: user.id, plan },
      subscription_data: { metadata: { supabase_user_id: user.id, plan } },
    });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "content-type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 400,
      headers: { ...corsHeaders, "content-type": "application/json" },
    });
  }
});
