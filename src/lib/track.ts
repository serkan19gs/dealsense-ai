import { supabase } from "@/lib/supabaseClient";

export async function track(name: string, properties: Record<string, unknown> = {}) {
  const { data } = await supabase.auth.getUser();
  await supabase.from("events").insert({
    user_id: data.user?.id ?? null,
    name,
    properties,
  });
}
