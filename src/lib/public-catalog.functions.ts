import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

function publicClient() {
  const url = import.meta.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY;
  return createClient<Database>(url || "", key || "", {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });
}

// SPA-compatible: calls Supabase directly without SSR
export async function getPublicCatalog() {
  const supabase = publicClient();
  const [{ data: categories }, { data: products }] = await Promise.all([
    supabase.from("categories").select("id, name, icon").order("name"),
    supabase
      .from("products")
      .select("id, name, description, price, emoji, includes, image_url, category_id, display_order, active")
      .eq("active", true)
      .order("display_order")
      .order("name"),
  ]);
  return { categories: categories ?? [], products: products ?? [] };
}

// SPA-compatible: calls Supabase directly without SSR
export async function getPublicSettings() {
  const supabase = publicClient();
  const { data } = await supabase
    .from("settings")
    .select("business_name, slogan, address, phone, whatsapp_number, footer_message")
    .limit(1)
    .maybeSingle();
  return data ?? {
    business_name: "Esquites La Parroquia",
    slogan: "El sabor que se antoja",
    address: null,
    phone: null,
    whatsapp_number: null,
    footer_message: null,
  };
}
