// SPA-compatible auth helper — replaces TanStack Start requireSupabaseAuth middleware
import { supabase } from "@/integrations/supabase/client";

export async function getAuthContext() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("No autenticado. Inicia sesión primero.");
  return { supabase, userId: session.user.id };
}
