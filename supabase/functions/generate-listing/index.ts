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

    await assertWithinPlanLimit(client, user.id, "listing_copy");

    const { address, bullets, tone } = await req.json();
    if (!address || !bullets) throw new Error("address and bullets are required.");

    const result = await askClaudeForJSON<{ headline: string; description: string }>(
      `You are a top-producing real estate copywriter. Respond with ONLY a JSON object:
{
  "headline": string (under 12 words, punchy),
  "description": string (3-4 short paragraphs, MLS-ready, no markdown, no emojis)
}
Tone should be: ${tone || "professional"}.`,
      `Address: ${address}\nKey facts:\n${bullets}`
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
