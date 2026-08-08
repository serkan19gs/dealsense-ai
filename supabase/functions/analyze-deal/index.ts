import { corsHeaders } from "../_shared/cors.ts";
import { askClaudeForJSON } from "../_shared/anthropic.ts";
import { serviceClient, assertWithinPlanLimit } from "../_shared/usage.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing Authorization header.");

    const client = serviceClient();
    const {
      data: { user },
    } = await client.auth.getUser(authHeader.replace("Bearer ", ""));
    if (!user) throw new Error("Not authenticated.");

    await assertWithinPlanLimit(client, user.id, "deal_analysis");

    const { address, price, estimatedRent, notes } = await req.json();
    if (!address || !price) throw new Error("address and price are required.");

    const result = await askClaudeForJSON(
      `You are an experienced real estate investment analyst. Given a property, respond with ONLY a JSON object matching this shape, no prose outside the JSON:
{
  "investmentScore": number (1-100, higher is a better deal),
  "estimatedRent": number (monthly rent in USD),
  "capRate": number (percentage, e.g. 6.2),
  "monthlyCashFlow": number (USD, can be negative),
  "summary": string (2-3 sentences on why this is or isn't a good deal),
  "redFlags": string[] (short phrases, empty array if none)
}
Assume standard operating expense ratios (taxes, insurance, maintenance, vacancy, management ~ 45-50% of gross rent) and a 25% down, 7% interest 30-year loan unless told otherwise.`,
      `Address: ${address}\nList price: $${price}\nEstimated monthly rent: ${
        estimatedRent ? `$${estimatedRent}` : "not provided, estimate it"
      }\nNotes: ${notes || "none"}`
    );

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "content-type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 400,
      headers: { ...corsHeaders, "content-type": "application/json" },
    });
  }
});
