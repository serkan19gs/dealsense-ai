import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    "Supabase env vars are missing. Copy .env.example to .env and fill in your project keys."
  );
}

// Table row/insert shapes are defined by hand in `@/types/database` and applied
// at each call site via casts, rather than as a generic here — the strict
// Database generic fights the postgrest-js query parser on manually written types.
export const supabase = createClient(
  supabaseUrl ?? "https://placeholder.supabase.co",
  supabaseAnonKey ?? "placeholder-anon-key"
);
