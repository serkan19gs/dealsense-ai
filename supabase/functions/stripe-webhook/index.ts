import Stripe from "https://esm.sh/stripe@16?target=deno";
import { serviceClient } from "../_shared/usage.ts";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2024-06-20",
});

const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET")!;

Deno.serve(async (req) => {
  const signature = req.headers.get("stripe-signature");
  if (!signature) return new Response("Missing signature", { status: 400 });

  const body = await req.text();
  let event: Stripe.Event;

  try {
    event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
  } catch (err) {
    return new Response(`Webhook signature verification failed: ${(err as Error).message}`, {
      status: 400,
    });
  }

  const client = serviceClient();

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.supabase_user_id;
        const plan = session.metadata?.plan as "pro" | "team" | undefined;
        if (userId && plan) {
          await client
            .from("subscriptions")
            .update({
              tier: plan,
              status: "active",
              stripe_subscription_id: session.subscription as string,
              seats: plan === "team" ? 10 : 1,
            })
            .eq("user_id", userId);
        }
        break;
      }
      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        const userId = sub.metadata?.supabase_user_id;
        if (userId) {
          await client
            .from("subscriptions")
            .update({
              status: sub.status as "active" | "trialing" | "past_due" | "canceled",
              current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
            })
            .eq("user_id", userId);
        }
        break;
      }
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const userId = sub.metadata?.supabase_user_id;
        if (userId) {
          await client
            .from("subscriptions")
            .update({ tier: "free", status: "canceled", stripe_subscription_id: null })
            .eq("user_id", userId);
        }
        break;
      }
    }
  } catch (err) {
    console.error("Error handling webhook event", err);
    return new Response("Webhook handler error", { status: 500 });
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { "content-type": "application/json" },
  });
});
