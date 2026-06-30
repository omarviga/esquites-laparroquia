// SPA-compatible auth middleware — no SSR/TanStack Start required
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

function getSupabaseClient() {
  const url = import.meta.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY;
  return createClient<Database>(url || "", key || "", {
    auth: {
      storage: typeof window !== "undefined" ? localStorage : undefined,
      persistSession: true,
      autoRefreshToken: true,
    },
  });
}

// Stub middleware compatible with createServerFn().middleware([])
// Passes supabase client + userId to handler context
export async function requireSupabaseAuth({ next }: { next: any }) {
  const supabase = getSupabaseClient();
  const { data } = await supabase.auth.getSession();
  const userId = data?.session?.user?.id ?? null;

  return next({
    context: { supabase, userId },
  });
}
