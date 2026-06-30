import { z } from "zod";
import { getAuthContext } from "./auth.helper";

async function assertAdmin(supabase: any, userId: string) {
  const { data } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (!data) throw new Error("Solo admin puede gestionar el catálogo.");
}

export const listCategories = async () => {
  const { supabase } = await getAuthContext();
  const { data, error } = await supabase.from("categories").select("*").order("name");
  if (error) throw new Error(error.message);
  return data ?? [];
};

const categoryInput = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(1).max(100),
  icon: z.string().trim().max(100).optional().nullable(),
});

export const upsertCategory = async (data: z.infer<typeof categoryInput>) => {
  const { supabase, userId } = await getAuthContext();
  await assertAdmin(supabase, userId);
  if (data.id) {
    const { error } = await supabase
      .from("categories")
      .update({ name: data.name, icon: data.icon ?? null })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase
      .from("categories")
      .insert({ name: data.name, icon: data.icon ?? null });
    if (error) throw new Error(error.message);
  }
  return { ok: true };
};

export const deleteCategory = async (data: { id: string }) => {
  const { supabase, userId } = await getAuthContext();
  await assertAdmin(supabase, userId);
  const { count } = await supabase
    .from("products")
    .select("id", { count: "exact", head: true })
    .eq("category_id", data.id);
  if ((count ?? 0) > 0) throw new Error("No se puede eliminar: la categoría tiene productos.");
  const { error } = await supabase.from("categories").delete().eq("id", data.id);
  if (error) throw new Error(error.message);
  return { ok: true };
};

export const listProducts = async () => {
  const { supabase } = await getAuthContext();
  const { data, error } = await supabase
    .from("products")
    .select("*, categories(name, icon)")
    .order("display_order")
    .order("name");
  if (error) throw new Error(error.message);
  return data ?? [];
};

const productInput = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(1).max(200),
  description: z.string().trim().max(1000).optional().nullable(),
  price: z.number().min(0).max(1_000_000),
  category_id: z.string().uuid().nullable(),
  active: z.boolean().default(true),
  image_url: z.string().trim().max(500).optional().nullable(),
  display_order: z.number().int().min(0).max(9999).default(0),
});

export const upsertProduct = async (data: z.infer<typeof productInput>) => {
  const { supabase, userId } = await getAuthContext();
  await assertAdmin(supabase, userId);
  const payload = {
    name: data.name,
    description: data.description ?? null,
    price: data.price,
    category_id: data.category_id,
    active: data.active,
    image_url: data.image_url ?? null,
    display_order: data.display_order,
  };
  if (data.id) {
    const { error } = await supabase.from("products").update(payload).eq("id", data.id);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase.from("products").insert(payload);
    if (error) throw new Error(error.message);
  }
  return { ok: true };
};

export const toggleProductActive = async (data: { id: string; active: boolean }) => {
  const { supabase, userId } = await getAuthContext();
  await assertAdmin(supabase, userId);
  const { error } = await supabase.from("products").update({ active: data.active }).eq("id", data.id);
  if (error) throw new Error(error.message);
  return { ok: true };
};

export const deleteProduct = async (data: { id: string }) => {
  const { supabase, userId } = await getAuthContext();
  await assertAdmin(supabase, userId);
  const { error } = await supabase.from("products").delete().eq("id", data.id);
  if (error) {
    if (error.message.includes("foreign key")) {
      throw new Error("No se puede eliminar: el producto tiene ventas registradas. Desactívalo en su lugar.");
    }
    throw new Error(error.message);
  }
  return { ok: true };
};
