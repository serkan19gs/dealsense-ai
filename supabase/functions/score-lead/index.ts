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

    await assertWithinPlanLimit(client, user.id, "lead_score");

    const { name, notes, leadType } = await req.json();
    if (!name || !notes) throw new Error("name and notes are required.");

    const result = await askClaudeForJSON<{
      score: number;
      urgency: "low" | "medium" | "high";
      reasoning: string;
      suggestedNextStep: string;
    }>(
      `You are a real estate sales lead-qualification expert. Respond with ONLY a JSON object:
{
  "score": number (1-100, likelihood to transact soon and quality of the lead),
  "urgency": "low" | "medium" | "high",
  "reasoning": string (1-2 sentences explaining the score),
  "suggestedNextStep": string (one concrete action the agent should take next)
}`,
      `Lead name: ${name}\nLead type: ${leadType || "buyer"}\nNotes: ${notes}`
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
