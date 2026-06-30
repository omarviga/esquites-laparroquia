-- ============================================================
-- FILE: 20260614171600_baseline_tables.sql
-- ============================================================

-- ============================================================
-- BASELINE: Tablas que Lovable auto-generaba y las migraciones asumen que existen
-- Debe ejecutarse ANTES que todas las demás migraciones
-- ============================================================

-- ============================================================
-- Categories
-- ============================================================
CREATE TABLE IF NOT EXISTS public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  icon TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- Products
-- ============================================================
CREATE TABLE IF NOT EXISTS public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC(12,2) NOT NULL,
  active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  emoji TEXT,
  image_url TEXT,
  includes TEXT[],
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- Modifier Groups
-- ============================================================
CREATE TABLE IF NOT EXISTS public.modifier_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT,
  required BOOLEAN DEFAULT false
);

-- ============================================================
-- Modifiers
-- ============================================================
CREATE TABLE IF NOT EXISTS public.modifiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  modifier_group_id UUID REFERENCES public.modifier_groups(id) ON DELETE CASCADE,
  name TEXT,
  extra_price NUMERIC(12,2) DEFAULT 0
);

-- ============================================================
-- Product Modifiers (junction)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.product_modifiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
  modifier_group_id UUID REFERENCES public.modifier_groups(id) ON DELETE CASCADE
);

-- ============================================================
-- Settings
-- ============================================================
CREATE TABLE IF NOT EXISTS public.settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_name TEXT,
  slogan TEXT,
  address TEXT,
  phone TEXT,
  tax NUMERIC(12,2) DEFAULT 0,
  footer_message TEXT DEFAULT '¡El sabor que nos une!',
  rfc TEXT,
  printer_enabled BOOLEAN DEFAULT false,
  printer_ip TEXT,
  printer_port INTEGER DEFAULT 9100,
  printer_width INTEGER DEFAULT 80,
  auto_print BOOLEAN DEFAULT false,
  auto_cut BOOLEAN DEFAULT true,
  open_drawer BOOLEAN DEFAULT false,
  logo_url TEXT,
  logo_data TEXT,
  show_logo BOOLEAN DEFAULT false,
  logo TEXT,
  qr_url TEXT,
  whatsapp_number TEXT,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- Cash Register
-- ============================================================
CREATE TABLE IF NOT EXISTS public.cash_register (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  opening_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'abierta',
  opened_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  closed_at TIMESTAMPTZ,
  closing_amount NUMERIC(12,2),
  expected_amount NUMERIC(12,2),
  real_amount NUMERIC(12,2),
  difference NUMERIC(12,2),
  notes TEXT,
  total_sales_cash NUMERIC(12,2) DEFAULT 0,
  total_sales_card NUMERIC(12,2) DEFAULT 0,
  total_sales_transfer NUMERIC(12,2) DEFAULT 0,
  opening_breakdown JSONB,
  closing_breakdown JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- Cash Movements (era "expenses" originalmente)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.cash_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cash_register_id UUID REFERENCES public.cash_register(id) ON DELETE SET NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  type TEXT NOT NULL DEFAULT 'salida',
  amount NUMERIC(12,2),
  concept TEXT,
  notes TEXT,
  payment_method TEXT DEFAULT 'efectivo',
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT cash_movements_type_chk CHECK (type IN ('entrada', 'salida'))
);

-- ============================================================
-- Customers
-- ============================================================
CREATE TABLE IF NOT EXISTS public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  loyalty_points INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- Sales
-- ============================================================
CREATE TABLE IF NOT EXISTS public.sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  folio INTEGER NOT NULL DEFAULT 0,
  subtotal NUMERIC(12,2),
  tax NUMERIC(12,2),
  total NUMERIC(12,2),
  payment_method TEXT,
  cash_received NUMERIC(12,2),
  change_amount NUMERIC(12,2),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  cash_register_id UUID REFERENCES public.cash_register(id) ON DELETE SET NULL,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  cancelled BOOLEAN NOT NULL DEFAULT false,
  cancelled_at TIMESTAMPTZ,
  cancelled_by UUID REFERENCES auth.users(id),
  kds_status TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- Sale Items
-- ============================================================
CREATE TABLE IF NOT EXISTS public.sale_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id UUID REFERENCES public.sales(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  product_name TEXT,
  product_emoji TEXT,
  quantity INTEGER DEFAULT 1,
  unit_price NUMERIC(12,2),
  unit_cost NUMERIC(12,2),
  total NUMERIC(12,2)
);

-- ============================================================
-- Sale Item Modifiers
-- ============================================================
CREATE TABLE IF NOT EXISTS public.sale_item_modifiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_item_id UUID REFERENCES public.sale_items(id) ON DELETE CASCADE,
  modifier_name TEXT,
  extra_price NUMERIC(12,2) DEFAULT 0
);

-- ============================================================
-- Inventory Items
-- ============================================================
CREATE TABLE IF NOT EXISTS public.inventory_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  stock NUMERIC(12,2) NOT NULL DEFAULT 0,
  unit TEXT NOT NULL,
  min_stock NUMERIC(12,2) NOT NULL DEFAULT 0,
  cost_per_unit NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- Product Recipes (junction: product ↔ inventory)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.product_recipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
  inventory_item_id UUID REFERENCES public.inventory_items(id) ON DELETE CASCADE,
  quantity NUMERIC(12,2) NOT NULL DEFAULT 1
);

-- ============================================================
-- Digital Menus
-- ============================================================
CREATE TABLE IF NOT EXISTS public.digital_menus (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  filename TEXT,
  file_url TEXT,
  active BOOLEAN DEFAULT false,
  uploaded_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- Settings Public View (for public-facing pages)
-- ============================================================
DROP VIEW IF EXISTS public.settings_public CASCADE;
CREATE OR REPLACE VIEW public.settings_public AS
  SELECT id, business_name, slogan, footer_message, tax
  FROM public.settings;


-- ============================================================
-- FILE: 20260614171607_1590d075-f8d6-4420-bdcc-d22b8da24ab9.sql
-- ============================================================

-- ============================================================
-- BLOQUE 1: Auth, profiles, roles
-- ============================================================

-- Drop legacy users table (not linked to auth.users)
DROP TABLE IF EXISTS public.users CASCADE;

-- App role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'cajero', 'supervisor');

-- Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_select_authenticated" ON public.profiles
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- User roles
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- has_role security definer
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.current_user_has_any_role(_roles public.app_role[])
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = ANY(_roles)
  )
$$;

CREATE POLICY "user_roles_select_own_or_admin" ON public.user_roles
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "user_roles_admin_manage" ON public.user_roles
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1))
  );
  -- Default role: cajero. First user gets admin (handled separately).
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'cajero');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- updated_at helper
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER profiles_touch_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ============================================================
-- BLOQUE 2: Cash register + movements
-- ============================================================

-- Ampliar cash_register
ALTER TABLE public.cash_register
  ALTER COLUMN id SET NOT NULL,
  ALTER COLUMN opening_amount SET DEFAULT 0,
  ALTER COLUMN opening_amount SET NOT NULL,
  ALTER COLUMN status SET DEFAULT 'abierta',
  ALTER COLUMN status SET NOT NULL,
  ALTER COLUMN opened_at SET DEFAULT now(),
  ALTER COLUMN opened_at SET NOT NULL,
  ADD COLUMN IF NOT EXISTS expected_amount NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS real_amount NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS difference NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS total_sales_cash NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_sales_card NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_sales_transfer NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();

-- Asegurar user_id FK válido
ALTER TABLE public.cash_register
  DROP CONSTRAINT IF EXISTS cash_register_user_id_fkey;
UPDATE public.cash_register SET user_id = NULL WHERE user_id IS NOT NULL AND user_id NOT IN (SELECT id FROM auth.users);
ALTER TABLE public.cash_register
  ADD CONSTRAINT cash_register_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

-- Solo una caja abierta por cajero
CREATE UNIQUE INDEX IF NOT EXISTS uq_cash_register_open_per_user
  ON public.cash_register(user_id) WHERE status = 'abierta';

GRANT SELECT, INSERT, UPDATE ON public.cash_register TO authenticated;
GRANT ALL ON public.cash_register TO service_role;
ALTER TABLE public.cash_register ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cash_register_select" ON public.cash_register
  FOR SELECT TO authenticated USING (
    user_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'supervisor')
  );
CREATE POLICY "cash_register_insert_own" ON public.cash_register
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "cash_register_update_own_or_admin" ON public.cash_register
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- Transform expenses → cash_movements (safe: only if expenses table exists)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='expenses') THEN
    ALTER TABLE public.expenses RENAME TO cash_movements;
  END IF;
END $$;
ALTER TABLE public.cash_movements
  ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT 'salida',
  ADD COLUMN IF NOT EXISTS cash_register_id UUID REFERENCES public.cash_register(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'efectivo';

ALTER TABLE public.cash_movements
  DROP CONSTRAINT IF EXISTS cash_movements_type_chk;
ALTER TABLE public.cash_movements
  ADD CONSTRAINT cash_movements_type_chk CHECK (type IN ('entrada', 'salida'));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.cash_movements TO authenticated;
GRANT ALL ON public.cash_movements TO service_role;
ALTER TABLE public.cash_movements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cash_movements_select" ON public.cash_movements
  FOR SELECT TO authenticated USING (
    user_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'supervisor')
  );
CREATE POLICY "cash_movements_insert_own" ON public.cash_movements
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- Sales: vincular cajero y caja
ALTER TABLE public.sales
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS cash_register_id UUID REFERENCES public.cash_register(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS cancelled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cancelled_by UUID REFERENCES auth.users(id);

GRANT SELECT, INSERT, UPDATE ON public.sales TO authenticated;
GRANT ALL ON public.sales TO service_role;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sales_select_authenticated" ON public.sales
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "sales_insert_own" ON public.sales
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "sales_update_cancel" ON public.sales
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'supervisor'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'supervisor'));

-- Sale items / modifiers RLS
GRANT SELECT, INSERT ON public.sale_items TO authenticated;
GRANT ALL ON public.sale_items TO service_role;
ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sale_items_select" ON public.sale_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "sale_items_insert" ON public.sale_items FOR INSERT TO authenticated WITH CHECK (true);

GRANT SELECT, INSERT ON public.sale_item_modifiers TO authenticated;
GRANT ALL ON public.sale_item_modifiers TO service_role;
ALTER TABLE public.sale_item_modifiers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sale_item_modifiers_select" ON public.sale_item_modifiers FOR SELECT TO authenticated USING (true);
CREATE POLICY "sale_item_modifiers_insert" ON public.sale_item_modifiers FOR INSERT TO authenticated WITH CHECK (true);

-- Catálogo (lectura libre auth, escritura admin)
GRANT SELECT ON public.categories TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.categories TO authenticated;
GRANT ALL ON public.categories TO service_role;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "categories_select" ON public.categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "categories_admin_write" ON public.categories FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

GRANT SELECT ON public.products TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.products TO authenticated;
GRANT ALL ON public.products TO service_role;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "products_select" ON public.products FOR SELECT TO authenticated USING (true);
CREATE POLICY "products_admin_write" ON public.products FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.modifier_groups TO authenticated;
GRANT ALL ON public.modifier_groups TO service_role;
ALTER TABLE public.modifier_groups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "modgroups_select" ON public.modifier_groups FOR SELECT TO authenticated USING (true);
CREATE POLICY "modgroups_admin_write" ON public.modifier_groups FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.modifiers TO authenticated;
GRANT ALL ON public.modifiers TO service_role;
ALTER TABLE public.modifiers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "modifiers_select" ON public.modifiers FOR SELECT TO authenticated USING (true);
CREATE POLICY "modifiers_admin_write" ON public.modifiers FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_modifiers TO authenticated;
GRANT ALL ON public.product_modifiers TO service_role;
ALTER TABLE public.product_modifiers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pmods_select" ON public.product_modifiers FOR SELECT TO authenticated USING (true);
CREATE POLICY "pmods_admin_write" ON public.product_modifiers FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.digital_menus TO authenticated;
GRANT SELECT ON public.digital_menus TO anon;
GRANT ALL ON public.digital_menus TO service_role;
ALTER TABLE public.digital_menus ENABLE ROW LEVEL SECURITY;
CREATE POLICY "menus_public_select" ON public.digital_menus FOR SELECT USING (active = true);
CREATE POLICY "menus_admin_all" ON public.digital_menus FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- Settings (negocio + impresora)
-- ============================================================
ALTER TABLE public.settings
  ADD COLUMN IF NOT EXISTS footer_message TEXT DEFAULT '¡El sabor que nos une!',
  ADD COLUMN IF NOT EXISTS rfc TEXT,
  ADD COLUMN IF NOT EXISTS printer_enabled BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS printer_ip TEXT,
  ADD COLUMN IF NOT EXISTS printer_port INTEGER DEFAULT 9100,
  ADD COLUMN IF NOT EXISTS printer_width INTEGER DEFAULT 80,
  ADD COLUMN IF NOT EXISTS auto_print BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS auto_cut BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS open_drawer BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

GRANT SELECT ON public.settings TO authenticated;
GRANT INSERT, UPDATE ON public.settings TO authenticated;
GRANT ALL ON public.settings TO service_role;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "settings_select" ON public.settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "settings_admin_write" ON public.settings FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Seed single settings row if empty
INSERT INTO public.settings (business_name, slogan, address, phone)
SELECT 'Esquites La Parroquia', '¡El sabor que nos une!', 'Acámbaro, Gto.', NULL
WHERE NOT EXISTS (SELECT 1 FROM public.settings);

-- ============================================================
-- Resumen de caja
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_cash_register_summary(_register_id UUID)
RETURNS JSON
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  reg public.cash_register;
  v_cash NUMERIC := 0;
  v_card NUMERIC := 0;
  v_transfer NUMERIC := 0;
  v_mixto NUMERIC := 0;
  v_in NUMERIC := 0;
  v_out NUMERIC := 0;
  v_sales_count INT := 0;
BEGIN
  SELECT * INTO reg FROM public.cash_register WHERE id = _register_id;
  IF reg IS NULL THEN RETURN NULL; END IF;

  SELECT
    COALESCE(SUM(CASE WHEN payment_method='efectivo' THEN total ELSE 0 END),0),
    COALESCE(SUM(CASE WHEN payment_method='tarjeta' THEN total ELSE 0 END),0),
    COALESCE(SUM(CASE WHEN payment_method='transferencia' THEN total ELSE 0 END),0),
    COALESCE(SUM(CASE WHEN payment_method='mixto' THEN total ELSE 0 END),0),
    COUNT(*)
  INTO v_cash, v_card, v_transfer, v_mixto, v_sales_count
  FROM public.sales
  WHERE cash_register_id = _register_id AND cancelled = false;

  SELECT
    COALESCE(SUM(CASE WHEN type='entrada' AND payment_method='efectivo' THEN amount ELSE 0 END),0),
    COALESCE(SUM(CASE WHEN type='salida' AND payment_method='efectivo' THEN amount ELSE 0 END),0)
  INTO v_in, v_out
  FROM public.cash_movements
  WHERE cash_register_id = _register_id;

  RETURN json_build_object(
    'register_id', reg.id,
    'opening_amount', reg.opening_amount,
    'sales_cash', v_cash,
    'sales_card', v_card,
    'sales_transfer', v_transfer,
    'sales_mixto', v_mixto,
    'sales_total', v_cash + v_card + v_transfer + v_mixto,
    'sales_count', v_sales_count,
    'cash_in', v_in,
    'cash_out', v_out,
    'expected_cash', reg.opening_amount + v_cash + v_in - v_out
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_cash_register_summary(UUID) TO authenticated;


-- ============================================================
-- FILE: 20260614171655_cc745778-e559-457f-b9e0-248a3407caea.sql
-- ============================================================

ALTER TABLE public.sale_items
  ADD COLUMN IF NOT EXISTS product_name TEXT,
  ADD COLUMN IF NOT EXISTS product_emoji TEXT;

-- Asegurar que product_id sea nullable (en caso de catálogo no migrado aún)
ALTER TABLE public.sale_items ALTER COLUMN product_id DROP NOT NULL;


-- ============================================================
-- FILE: 20260614182500_seed_menu_catalog.sql
-- ============================================================

-- Seed menu catalog from Esquites La Parroquia printed menu.
-- Idempotent: safe to run more than once.

DO $$
DECLARE
  v_fritura UUID;
  v_elote UUID;
  v_papa_maruchan UUID;
  v_chicharron UUID;
  v_preparados UUID;
  v_lokos UUID;
  v_uchepos UUID;
  v_tipo_fritura UUID;
  v_color_elote UUID;
BEGIN
  INSERT INTO public.categories (name, icon)
  SELECT 'Fritura', '🍟'
  WHERE NOT EXISTS (SELECT 1 FROM public.categories WHERE lower(name) = lower('Fritura'));

  INSERT INTO public.categories (name, icon)
  SELECT 'Elote', '🌽'
  WHERE NOT EXISTS (SELECT 1 FROM public.categories WHERE lower(name) = lower('Elote'));

  IF EXISTS (SELECT 1 FROM public.categories WHERE lower(name) = lower('Maruchan'))
     AND NOT EXISTS (SELECT 1 FROM public.categories WHERE lower(name) = lower('Papa & Maruchan')) THEN
    UPDATE public.categories
    SET name = 'Papa & Maruchan', icon = '🍜'
    WHERE lower(name) = lower('Maruchan');
  ELSE
    INSERT INTO public.categories (name, icon)
    SELECT 'Papa & Maruchan', '🍜'
    WHERE NOT EXISTS (SELECT 1 FROM public.categories WHERE lower(name) = lower('Papa & Maruchan'));
  END IF;

  INSERT INTO public.categories (name, icon)
  SELECT 'Chicharrón Casero', '🐷'
  WHERE NOT EXISTS (SELECT 1 FROM public.categories WHERE lower(name) = lower('Chicharrón Casero'));

  INSERT INTO public.categories (name, icon)
  SELECT 'Preparados', '👑'
  WHERE NOT EXISTS (SELECT 1 FROM public.categories WHERE lower(name) = lower('Preparados'));

  INSERT INTO public.categories (name, icon)
  SELECT 'Lokos', '💥'
  WHERE NOT EXISTS (SELECT 1 FROM public.categories WHERE lower(name) = lower('Lokos'));

  INSERT INTO public.categories (name, icon)
  SELECT 'Uchepos', '🫔'
  WHERE NOT EXISTS (SELECT 1 FROM public.categories WHERE lower(name) = lower('Uchepos'));

  SELECT id INTO v_fritura FROM public.categories WHERE lower(name) = lower('Fritura') LIMIT 1;
  SELECT id INTO v_elote FROM public.categories WHERE lower(name) = lower('Elote') LIMIT 1;
  SELECT id INTO v_papa_maruchan FROM public.categories WHERE lower(name) = lower('Papa & Maruchan') LIMIT 1;
  SELECT id INTO v_chicharron FROM public.categories WHERE lower(name) = lower('Chicharrón Casero') LIMIT 1;
  SELECT id INTO v_preparados FROM public.categories WHERE lower(name) = lower('Preparados') LIMIT 1;
  SELECT id INTO v_lokos FROM public.categories WHERE lower(name) = lower('Lokos') LIMIT 1;
  SELECT id INTO v_uchepos FROM public.categories WHERE lower(name) = lower('Uchepos') LIMIT 1;

  UPDATE public.categories SET icon = '🍟' WHERE id = v_fritura AND icon IS NULL;
  UPDATE public.categories SET icon = '🌽' WHERE id = v_elote AND icon IS NULL;
  UPDATE public.categories SET icon = '🍜' WHERE id = v_papa_maruchan AND icon IS NULL;
  UPDATE public.categories SET icon = '🐷' WHERE id = v_chicharron AND icon IS NULL;
  UPDATE public.categories SET icon = '👑' WHERE id = v_preparados AND icon IS NULL;
  UPDATE public.categories SET icon = '💥' WHERE id = v_lokos AND icon IS NULL;
  UPDATE public.categories SET icon = '🫔' WHERE id = v_uchepos AND icon IS NULL;

  INSERT INTO public.products (category_id, name, description, price, active, display_order)
  SELECT incoming.category_id, incoming.name, incoming.description, incoming.price, incoming.active, incoming.display_order
  FROM (VALUES
    (v_fritura, 'Churros con crema y queso', NULL, 40, true, 10),
    (v_fritura, 'Frituras solas', 'Elige Tostitos, Takis, Cheetos, Doritos, Ruffles o Churros.', 25, true, 20),
    (v_fritura, 'Frituras con verdura', 'Con repollo, jitomate y cueritos.', 20, true, 30),
    (v_fritura, 'Frituras preparadas', 'Prepáralas con crema, queso, salsa y limón al gusto.', 35, true, 40),
    (v_fritura, 'Cacahuate japonés preparado', 'Preparado con crema, queso, salsa y limón al gusto.', 40, true, 50),
    (v_fritura, 'Papas doradas preparadas', 'Preparadas con crema, queso, salsa y limón al gusto.', 40, true, 60),
    (v_elote, 'Entero', 'Disponible en elote blanco o amarillo.', 25, true, 10),
    (v_elote, 'Entero con aderezos', 'Disponible en elote blanco o amarillo.', 40, true, 20),
    (v_elote, 'Vaso chico', 'Disponible en elote blanco o amarillo.', 35, true, 30),
    (v_elote, 'Cazuelita', 'Disponible en elote blanco o amarillo.', 40, true, 40),
    (v_elote, 'Vaso mediano', 'Disponible en elote blanco o amarillo.', 45, true, 50),
    (v_elote, 'Vaso grande', 'Disponible en elote blanco o amarillo.', 50, true, 60),
    (v_papa_maruchan, 'Papa cocida', NULL, 35, true, 10),
    (v_papa_maruchan, 'Papa cocida con aderezos', NULL, 50, true, 20),
    (v_papa_maruchan, 'Papa cocida con elote', NULL, 65, true, 30),
    (v_papa_maruchan, 'Maruchan con limón y salsa', NULL, 30, true, 40),
    (v_papa_maruchan, 'Maruchan con aderezos', NULL, 50, true, 50),
    (v_papa_maruchan, 'Maruchan con elote', NULL, 65, true, 60),
    (v_chicharron, 'Chicharrón preparado', 'Lleva jitomate, repollo, cueritos, sal, limón y salsa al gusto.', 40, true, 10),
    (v_preparados, 'Dorilocos', 'Con elote. Llevan elote, crema o mayonesa, queso, cacahuate japonés, salsa y limón al gusto.', 65, true, 10),
    (v_preparados, 'Tostilocos', 'Con elote. Llevan elote, crema o mayonesa, queso, cacahuate japonés, salsa y limón al gusto.', 65, true, 20),
    (v_preparados, 'Churrolocos', 'Con elote. Llevan elote, crema o mayonesa, queso, cacahuate japonés, salsa y limón al gusto.', 65, true, 30),
    (v_preparados, 'Chicharrolotes', 'Con elote. Llevan elote, crema o mayonesa, queso, cacahuate japonés, salsa y limón al gusto.', 65, true, 40),
    (v_preparados, 'Takilotes', 'Con elote. Llevan elote, crema o mayonesa, queso, cacahuate japonés, salsa y limón al gusto.', 65, true, 50),
    (v_preparados, 'Cheetolotes', 'Con elote. Llevan elote, crema o mayonesa, queso, cacahuate japonés, salsa y limón al gusto.', 65, true, 60),
    (v_lokos, 'Dorilokos', 'Llevan jitomate, repollo, cueritos, pepino, jícama, cacahuate japonés, gomitas, clamato, salsa inglesa y jugo Maggi.', 65, true, 10),
    (v_lokos, 'Tostilokos', 'Llevan jitomate, repollo, cueritos, pepino, jícama, cacahuate japonés, gomitas, clamato, salsa inglesa y jugo Maggi.', 65, true, 20),
    (v_lokos, 'Cheetolokos', 'Llevan jitomate, repollo, cueritos, pepino, jícama, cacahuate japonés, gomitas, clamato, salsa inglesa y jugo Maggi.', 65, true, 30),
    (v_lokos, 'Takilokos', 'Llevan jitomate, repollo, cueritos, pepino, jícama, cacahuate japonés, gomitas, clamato, salsa inglesa y jugo Maggi.', 65, true, 40),
    (v_lokos, 'Churrolokos', 'Llevan jitomate, repollo, cueritos, pepino, jícama, cacahuate japonés, gomitas, clamato, salsa inglesa y jugo Maggi.', 65, true, 50),
    (v_lokos, 'Rufflelokos', 'Llevan jitomate, repollo, cueritos, pepino, jícama, cacahuate japonés, gomitas, clamato, salsa inglesa y jugo Maggi.', 65, true, 60),
    (v_lokos, 'Papas lokas', 'Llevan jitomate, repollo, cueritos, pepino, jícama, cacahuate japonés, gomitas, clamato, salsa inglesa y jugo Maggi.', 65, true, 70),
    (v_lokos, 'Chicharrón loko', 'Llevan jitomate, repollo, cueritos, pepino, jícama, cacahuate japonés, gomitas, clamato, salsa inglesa y jugo Maggi.', 65, true, 80),
    (v_uchepos, 'Uchepo sencillo', NULL, 16, true, 10),
    (v_uchepos, 'Uchepos preparados', '3 piezas con crema, queso y salsa.', 40, true, 20),
    (v_uchepos, 'Uchepos con elote', '3 uchepos preparados + elote.', 65, true, 30)
  ) AS incoming(category_id, name, description, price, active, display_order)
  WHERE NOT EXISTS (
    SELECT 1 FROM public.products p WHERE lower(p.name) = lower(incoming.name)
  );

  UPDATE public.products AS existing
  SET
    category_id = incoming.category_id,
    description = incoming.description,
    price = incoming.price,
    active = incoming.active,
    display_order = incoming.display_order
  FROM (
    VALUES
      (v_fritura, 'Churros con crema y queso', NULL::TEXT, 40::NUMERIC, true, 10),
      (v_fritura, 'Frituras solas', 'Elige Tostitos, Takis, Cheetos, Doritos, Ruffles o Churros.', 25::NUMERIC, true, 20),
      (v_fritura, 'Frituras con verdura', 'Con repollo, jitomate y cueritos.', 20::NUMERIC, true, 30),
      (v_elote, 'Entero', 'Disponible en elote blanco o amarillo.', 25::NUMERIC, true, 10),
      (v_elote, 'Entero con aderezos', 'Disponible en elote blanco o amarillo.', 40::NUMERIC, true, 20),
      (v_elote, 'Vaso chico', 'Disponible en elote blanco o amarillo.', 35::NUMERIC, true, 30),
      (v_elote, 'Cazuelita', 'Disponible en elote blanco o amarillo.', 40::NUMERIC, true, 40),
      (v_elote, 'Vaso mediano', 'Disponible en elote blanco o amarillo.', 45::NUMERIC, true, 50),
      (v_elote, 'Vaso grande', 'Disponible en elote blanco o amarillo.', 50::NUMERIC, true, 60),
      (v_papa_maruchan, 'Maruchan con limón y salsa', NULL::TEXT, 30::NUMERIC, true, 40),
      (v_papa_maruchan, 'Maruchan con aderezos', NULL::TEXT, 50::NUMERIC, true, 50),
      (v_papa_maruchan, 'Maruchan con elote', NULL::TEXT, 65::NUMERIC, true, 60)
  ) AS incoming(category_id, name, description, price, active, display_order)
  WHERE lower(existing.name) = lower(incoming.name);

  INSERT INTO public.modifier_groups (name, required)
  SELECT 'Tipo de fritura', true
  WHERE NOT EXISTS (SELECT 1 FROM public.modifier_groups WHERE lower(name) = lower('Tipo de fritura'));

  INSERT INTO public.modifier_groups (name, required)
  SELECT 'Color de elote', true
  WHERE NOT EXISTS (SELECT 1 FROM public.modifier_groups WHERE lower(name) = lower('Color de elote'));

  SELECT id INTO v_tipo_fritura FROM public.modifier_groups WHERE lower(name) = lower('Tipo de fritura') LIMIT 1;
  SELECT id INTO v_color_elote FROM public.modifier_groups WHERE lower(name) = lower('Color de elote') LIMIT 1;

  INSERT INTO public.modifiers (modifier_group_id, name, extra_price)
  SELECT v_tipo_fritura, option_name, 0
  FROM (VALUES ('Tostitos'), ('Takis'), ('Cheetos'), ('Doritos'), ('Ruffles'), ('Churros')) AS options(option_name)
  WHERE NOT EXISTS (
    SELECT 1 FROM public.modifiers
    WHERE modifier_group_id = v_tipo_fritura AND lower(name) = lower(option_name)
  );

  INSERT INTO public.modifiers (modifier_group_id, name, extra_price)
  SELECT v_color_elote, option_name, 0
  FROM (VALUES ('Blanco'), ('Amarillo')) AS options(option_name)
  WHERE NOT EXISTS (
    SELECT 1 FROM public.modifiers
    WHERE modifier_group_id = v_color_elote AND lower(name) = lower(option_name)
  );

  INSERT INTO public.product_modifiers (product_id, modifier_group_id)
  SELECT p.id, v_tipo_fritura
  FROM public.products p
  WHERE lower(p.name) IN (
    lower('Frituras solas'),
    lower('Frituras con verdura'),
    lower('Frituras preparadas')
  )
  AND NOT EXISTS (
    SELECT 1 FROM public.product_modifiers pm
    WHERE pm.product_id = p.id AND pm.modifier_group_id = v_tipo_fritura
  );

  INSERT INTO public.product_modifiers (product_id, modifier_group_id)
  SELECT p.id, v_color_elote
  FROM public.products p
  WHERE p.category_id = v_elote
  AND NOT EXISTS (
    SELECT 1 FROM public.product_modifiers pm
    WHERE pm.product_id = p.id AND pm.modifier_group_id = v_color_elote
  );

  UPDATE public.settings
  SET
    business_name = COALESCE(business_name, 'Esquites La Parroquia'),
    slogan = COALESCE(slogan, '¡El sabor que nos une!'),
    address = COALESCE(address, 'Acámbaro, Gto.'),
    footer_message = COALESCE(footer_message, '¡El sabor que nos une!'),
    tax = COALESCE(tax, 0);
END $$;


-- ============================================================
-- FILE: 20260615010901_4bded2df-5272-4d90-8be1-0c03c225a5b6.sql
-- ============================================================

-- Tighten profiles SELECT: own row or admin/supervisor
DROP POLICY IF EXISTS profiles_select_authenticated ON public.profiles;
CREATE POLICY profiles_select_self_or_admin ON public.profiles
  FOR SELECT TO authenticated
  USING (
    id = auth.uid()
    OR public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'supervisor')
  );

-- Settings: split sensitive vs public. Keep table admin-only for full read.
-- Create a safe public view exposing only non-sensitive fields used by tickets/UI.
DROP POLICY IF EXISTS settings_select ON public.settings;
CREATE POLICY settings_select_admin ON public.settings
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'supervisor')
  );

DROP VIEW IF EXISTS public.settings_public CASCADE;
CREATE OR REPLACE VIEW public.settings_public
WITH (security_invoker = true) AS
SELECT id, business_name, slogan, footer_message, tax
FROM public.settings;
GRANT SELECT ON public.settings_public TO authenticated, anon;

-- Sales: own row or admin/supervisor
DROP POLICY IF EXISTS sales_select_authenticated ON public.sales;
CREATE POLICY sales_select_own_or_admin ON public.sales
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'supervisor')
  );

-- Sale items: scoped via parent sale
DROP POLICY IF EXISTS sale_items_select ON public.sale_items;
CREATE POLICY sale_items_select_scoped ON public.sale_items
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.sales s
      WHERE s.id = sale_items.sale_id
        AND (
          s.user_id = auth.uid()
          OR public.has_role(auth.uid(), 'admin')
          OR public.has_role(auth.uid(), 'supervisor')
        )
    )
  );

DROP POLICY IF EXISTS sale_items_insert ON public.sale_items;
CREATE POLICY sale_items_insert_scoped ON public.sale_items
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.sales s
      WHERE s.id = sale_items.sale_id
        AND (s.user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
    )
  );

-- Sale item modifiers: scoped via parent sale_item -> sale
DROP POLICY IF EXISTS sale_item_modifiers_select ON public.sale_item_modifiers;
CREATE POLICY sale_item_modifiers_select_scoped ON public.sale_item_modifiers
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.sale_items si
      JOIN public.sales s ON s.id = si.sale_id
      WHERE si.id = sale_item_modifiers.sale_item_id
        AND (
          s.user_id = auth.uid()
          OR public.has_role(auth.uid(), 'admin')
          OR public.has_role(auth.uid(), 'supervisor')
        )
    )
  );

DROP POLICY IF EXISTS sale_item_modifiers_insert ON public.sale_item_modifiers;
CREATE POLICY sale_item_modifiers_insert_scoped ON public.sale_item_modifiers
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.sale_items si
      JOIN public.sales s ON s.id = si.sale_id
      WHERE si.id = sale_item_modifiers.sale_item_id
        AND (s.user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
    )
  );

-- Lock down SECURITY DEFINER functions: revoke from public/anon
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.current_user_has_any_role(app_role[]) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_cash_register_summary(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_user_has_any_role(app_role[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_cash_register_summary(uuid) TO authenticated;

-- Fix mutable search_path on touch_updated_at
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;


-- ============================================================
-- FILE: 20260615011206_8bc98afa-bf30-41f9-9c8e-0e9808d8d50c.sql
-- ============================================================

CREATE POLICY "menus_admin_objects_all"
ON storage.objects
FOR ALL TO authenticated
USING (bucket_id = 'menus' AND public.has_role(auth.uid(), 'admin'))
WITH CHECK (bucket_id = 'menus' AND public.has_role(auth.uid(), 'admin'));


-- ============================================================
-- FILE: 20260617000000_pos_improvements.sql
-- ============================================================

-- POS Improvements Migration
-- Add breakdown columns to cash_register
ALTER TABLE public.cash_register
ADD COLUMN IF NOT EXISTS opening_breakdown jsonb,
ADD COLUMN IF NOT EXISTS closing_breakdown jsonb;

-- Add whatsapp_number to settings
ALTER TABLE public.settings
ADD COLUMN IF NOT EXISTS whatsapp_number text;

-- Add emoji and includes to products
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS emoji text,
ADD COLUMN IF NOT EXISTS includes text;

-- RLS Policies for public access to products and categories
-- We want anonymous users to be able to see active products and categories for the menu.

-- Categories public access
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'categories' AND policyname = 'Allow public read access'
  ) THEN
    ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "Allow public read access" ON public.categories
      FOR SELECT TO anon USING (true);
  END IF;
END $$;

-- Products public access (only active products)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'products' AND policyname = 'Allow public read access'
  ) THEN
    ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "Allow public read access" ON public.products
      FOR SELECT TO anon USING (active = true);
  END IF;
END $$;

-- Modifier groups public access
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'modifier_groups' AND policyname = 'Allow public read access'
  ) THEN
    ALTER TABLE public.modifier_groups ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "Allow public read access" ON public.modifier_groups
      FOR SELECT TO anon USING (true);
  END IF;
END $$;

-- Modifiers public access
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'modifiers' AND policyname = 'Allow public read access'
  ) THEN
    ALTER TABLE public.modifiers ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "Allow public read access" ON public.modifiers
      FOR SELECT TO anon USING (true);
  END IF;
END $$;

-- Product modifiers public access
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'product_modifiers' AND policyname = 'Allow public read access'
  ) THEN
    ALTER TABLE public.product_modifiers ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "Allow public read access" ON public.product_modifiers
      FOR SELECT TO anon USING (true);
  END IF;
END $$;


-- ============================================================
-- FILE: 20260617000100_inventory_recipes.sql
-- ============================================================

-- Inventory Items
CREATE TABLE IF NOT EXISTS inventory_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  unit TEXT NOT NULL, -- 'kg', 'gr', 'l', 'ml', 'pza'
  stock DECIMAL(10,2) NOT NULL DEFAULT 0,
  min_stock DECIMAL(10,2) NOT NULL DEFAULT 0,
  cost_per_unit DECIMAL(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Recipes (Linking Products to Inventory)
CREATE TABLE IF NOT EXISTS product_recipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  inventory_item_id UUID REFERENCES inventory_items(id) ON DELETE CASCADE,
  quantity DECIMAL(10,3) NOT NULL, -- amount of item per product
  UNIQUE(product_id, inventory_item_id)
);

-- Enable RLS
ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_recipes ENABLE ROW LEVEL SECURITY;

-- Basic Policies (Allow authenticated users)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow all to authenticated' AND tablename = 'inventory_items') THEN
    CREATE POLICY "Allow all to authenticated" ON inventory_items FOR ALL TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow all to authenticated' AND tablename = 'product_recipes') THEN
    CREATE POLICY "Allow all to authenticated" ON product_recipes FOR ALL TO authenticated USING (true);
  END IF;
END $$;


-- ============================================================
-- FILE: 20260617000200_track_costs.sql
-- ============================================================

-- Add unit_cost to sale_items to track COGS (Cost of Goods Sold)
ALTER TABLE sale_items ADD COLUMN IF NOT EXISTS unit_cost DECIMAL(10,2) DEFAULT 0;


-- ============================================================
-- FILE: 20260617000300_crm_loyalty.sql
-- ============================================================

-- Create customers table
CREATE TABLE IF NOT EXISTS customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    loyalty_points INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add customer_id to sales
ALTER TABLE sales ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES customers(id);

-- Enable RLS
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated access to customers"
ON customers FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);


-- ============================================================
-- FILE: 20260617000400_kds_setup.sql
-- ============================================================

-- Add KDS status to sales
ALTER TABLE sales ADD COLUMN IF NOT EXISTS kds_status TEXT DEFAULT 'pendiente';
-- pendiete, preparando, listo, entregado

-- Enable realtime for sales table
ALTER PUBLICATION supabase_realtime ADD TABLE sales;


-- ============================================================
-- FILE: 20260617000800_settings_logo.sql
-- ============================================================

-- Agregar soporte para logo en tickets
ALTER TABLE public.settings 
  ADD COLUMN IF NOT EXISTS logo_url TEXT,
  ADD COLUMN IF NOT EXISTS logo_data TEXT, -- Almacena el bitmap procesado (JSON stringificado)
  ADD COLUMN IF NOT EXISTS show_logo BOOLEAN DEFAULT false;


-- ============================================================
-- FILE: 20260617070705_7e7b39b5-8e86-4a39-a995-c03c5c308d52.sql
-- ============================================================

-- 1. Cash register denominations breakdown
ALTER TABLE public.cash_register
  ADD COLUMN IF NOT EXISTS opening_breakdown jsonb,
  ADD COLUMN IF NOT EXISTS closing_breakdown jsonb;

-- 2. Settings: whatsapp number for digital menu orders
ALTER TABLE public.settings
  ADD COLUMN IF NOT EXISTS whatsapp_number text;

-- 3. Products: emoji column for display in menu
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS emoji text,
  ADD COLUMN IF NOT EXISTS includes text[];

-- 4. Public (anon) read on products + categories for public menu
GRANT SELECT ON public.products TO anon;
GRANT SELECT ON public.categories TO anon;

DROP POLICY IF EXISTS products_public_select ON public.products;
CREATE POLICY products_public_select ON public.products
  FOR SELECT TO anon USING (active = true);

DROP POLICY IF EXISTS categories_public_select ON public.categories;
CREATE POLICY categories_public_select ON public.categories
  FOR SELECT TO anon USING (true);

-- 5. Seed categories and products (idempotent)
INSERT INTO public.categories (name, icon) VALUES
  ('Fritura', '🌽'),
  ('Elote', '🌽'),
  ('Maruchan', '🍜'),
  ('Chicharrón', '🥓'),
  ('Preparados', '🥣'),
  ('Lokos', '🔥'),
  ('Uchepos', '🫔')
ON CONFLICT DO NOTHING;

-- Seed products only if none exist yet (avoid duplicating)
DO $$
DECLARE
  cat_fritura uuid;
  cat_elote uuid;
  cat_maruchan uuid;
  cat_chicharron uuid;
  cat_preparados uuid;
  cat_lokos uuid;
  cat_uchepos uuid;
  has_products int;
BEGIN
  SELECT count(*) INTO has_products FROM public.products;
  IF has_products > 0 THEN RETURN; END IF;

  SELECT id INTO cat_fritura FROM public.categories WHERE name='Fritura' LIMIT 1;
  SELECT id INTO cat_elote FROM public.categories WHERE name='Elote' LIMIT 1;
  SELECT id INTO cat_maruchan FROM public.categories WHERE name='Maruchan' LIMIT 1;
  SELECT id INTO cat_chicharron FROM public.categories WHERE name='Chicharrón' LIMIT 1;
  SELECT id INTO cat_preparados FROM public.categories WHERE name='Preparados' LIMIT 1;
  SELECT id INTO cat_lokos FROM public.categories WHERE name='Lokos' LIMIT 1;
  SELECT id INTO cat_uchepos FROM public.categories WHERE name='Uchepos' LIMIT 1;

  INSERT INTO public.products (category_id, name, description, price, emoji, includes, display_order, active) VALUES
    (cat_fritura, 'Churros con crema y queso', NULL, 40, '🥨', NULL, 1, true),
    (cat_fritura, 'Frituras solas', NULL, 25, '🍟', NULL, 2, true),
    (cat_fritura, 'Fritura con verdura', 'Repollo, jitomate, cueritos', 20, '🥗', NULL, 3, true),
    (cat_fritura, 'Preparados con Frituras', NULL, 35, '🌶️', NULL, 4, true),
    (cat_fritura, 'Preparados con Cacahuate japonés', NULL, 40, '🥜', NULL, 5, true),
    (cat_fritura, 'Preparados con Papas doradas', NULL, 40, '🥔', NULL, 6, true),
    (cat_elote, 'Entero', NULL, 25, '🌽', NULL, 1, true),
    (cat_elote, 'Entero con aderezos', NULL, 40, '🌽', NULL, 2, true),
    (cat_elote, 'Vaso chico', NULL, 35, '🥤', NULL, 3, true),
    (cat_elote, 'Cazuelita', NULL, 40, '🍲', NULL, 4, true),
    (cat_elote, 'Vaso mediano', NULL, 45, '🥤', NULL, 5, true),
    (cat_elote, 'Vaso grande', NULL, 50, '🥛', NULL, 6, true),
    (cat_maruchan, 'Maruchan con limón y salsa', NULL, 30, '🍜', NULL, 1, true),
    (cat_maruchan, 'Maruchan con aderezos', NULL, 50, '🍜', NULL, 2, true),
    (cat_maruchan, 'Maruchan con elote', NULL, 65, '🍜', NULL, 3, true),
    (cat_chicharron, 'Chicharrón preparado', 'Jitomate, repollo, cueritos, sal, limón y salsa al gusto.', 40, '🥓', NULL, 1, true),
    (cat_preparados, 'Dorilocos', NULL, 65, '🥣', ARRAY['Elote','Crema o mayonesa','Queso','Cacahuate japonés','Salsa','Limón'], 1, true),
    (cat_preparados, 'Tostilocos', NULL, 65, '🥣', ARRAY['Elote','Crema o mayonesa','Queso','Cacahuate japonés','Salsa','Limón'], 2, true),
    (cat_preparados, 'Churrolocos', NULL, 65, '🥣', ARRAY['Elote','Crema o mayonesa','Queso','Cacahuate japonés','Salsa','Limón'], 3, true),
    (cat_preparados, 'Chicharrolotes', NULL, 65, '🥣', ARRAY['Elote','Crema o mayonesa','Queso','Cacahuate japonés','Salsa','Limón'], 4, true),
    (cat_preparados, 'Takilotes', NULL, 65, '🥣', ARRAY['Elote','Crema o mayonesa','Queso','Cacahuate japonés','Salsa','Limón'], 5, true),
    (cat_preparados, 'Cheetolotes', NULL, 65, '🥣', ARRAY['Elote','Crema o mayonesa','Queso','Cacahuate japonés','Salsa','Limón'], 6, true),
    (cat_lokos, 'Dorilokos', NULL, 65, '🔥', ARRAY['Jitomate','Repollo','Pepino','Jícama','Cueritos','Cacahuate japonés','Gomitas','Clamato','Salsa inglesa','Jugo Maggi'], 1, true),
    (cat_lokos, 'Tostilokos', NULL, 65, '🔥', ARRAY['Jitomate','Repollo','Pepino','Jícama','Cueritos','Cacahuate japonés','Gomitas','Clamato','Salsa inglesa','Jugo Maggi'], 2, true),
    (cat_lokos, 'Cheetolokos', NULL, 65, '🔥', ARRAY['Jitomate','Repollo','Pepino','Jícama','Cueritos','Cacahuate japonés','Gomitas','Clamato','Salsa inglesa','Jugo Maggi'], 3, true),
    (cat_lokos, 'Takilokos', NULL, 65, '🔥', ARRAY['Jitomate','Repollo','Pepino','Jícama','Cueritos','Cacahuate japonés','Gomitas','Clamato','Salsa inglesa','Jugo Maggi'], 4, true),
    (cat_lokos, 'Churrolokos', NULL, 65, '🔥', ARRAY['Jitomate','Repollo','Pepino','Jícama','Cueritos','Cacahuate japonés','Gomitas','Clamato','Salsa inglesa','Jugo Maggi'], 5, true),
    (cat_lokos, 'Rufflelokos', NULL, 65, '🔥', ARRAY['Jitomate','Repollo','Pepino','Jícama','Cueritos','Cacahuate japonés','Gomitas','Clamato','Salsa inglesa','Jugo Maggi'], 6, true),
    (cat_lokos, 'Papas Lokas', NULL, 65, '🔥', ARRAY['Jitomate','Repollo','Pepino','Jícama','Cueritos','Cacahuate japonés','Gomitas','Clamato','Salsa inglesa','Jugo Maggi'], 7, true),
    (cat_lokos, 'Chicharrón Loko', NULL, 65, '🔥', ARRAY['Jitomate','Repollo','Pepino','Jícama','Cueritos','Cacahuate japonés','Gomitas','Clamato','Salsa inglesa','Jugo Maggi'], 8, true),
    (cat_uchepos, 'Uchepo sencillo', NULL, 16, '🫔', NULL, 1, true),
    (cat_uchepos, 'Uchepos preparados (3 pz)', 'Crema, queso, salsa', 40, '🫔', NULL, 2, true),
    (cat_uchepos, 'Uchepos con elote', '3 uchepos preparados + elote', 65, '🫔', NULL, 3, true);
END $$;


-- ============================================================
-- FILE: 20260623000000_add_sales_status.sql
-- ============================================================

-- Add status column to sales table
ALTER TABLE sales ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'completada';
-- completada, cancelada, pendiente


-- ============================================================
-- FILE: 20260623000001_fix_folio_text.sql
-- ============================================================

-- Fix folio column: POS generates text folios like "LP-DEV-0001"
-- If it's currently INTEGER, convert to TEXT
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'sales' AND column_name = 'folio' AND data_type = 'integer'
  ) THEN
    ALTER TABLE sales ALTER COLUMN folio TYPE TEXT;
  END IF;
END $$;


-- ============================================================
-- FILE: 20260623000002_add_sales_missing_columns.sql
-- ============================================================

-- Add missing columns to sales table needed by corte, historial, and cancel features
ALTER TABLE sales ADD COLUMN IF NOT EXISTS cancelled BOOLEAN DEFAULT false;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS cancelled_by UUID REFERENCES auth.users(id);
ALTER TABLE sales ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'completada';


-- ============================================================
-- FILE: expenses.sql
-- ============================================================

-- Expenses / Control de Gastos table
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  amount NUMERIC NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'insumos',
  supplier TEXT,
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  payment_method TEXT DEFAULT 'efectivo',
  photo_url TEXT,
  ocr_text TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS: authenticated users can read all expenses, insert/update their own
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read expenses" ON expenses
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated can insert expenses" ON expenses
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated can update expenses" ON expenses
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated can delete expenses" ON expenses
  FOR DELETE TO authenticated USING (true);

-- Storage bucket for receipt photos
INSERT INTO storage.buckets (id, name, public) VALUES ('receipts', 'receipts', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Authenticated can upload receipts" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'receipts');

CREATE POLICY "Anyone can view receipts" ON storage.objects
  FOR SELECT USING (bucket_id = 'receipts');


-- ============================================================
-- FILE: payment_tracking.sql
-- ============================================================

-- Migration: Add payment tracking columns to sales table
-- Run this in Supabase SQL Editor

-- Add columns for tracking Mercado Pago / digital payments
ALTER TABLE sales
ADD COLUMN IF NOT EXISTS payment_id text,
ADD COLUMN IF NOT EXISTS payment_status text,
ADD COLUMN IF NOT EXISTS payment_details jsonb;

COMMENT ON COLUMN sales.payment_id IS 'Mercado Pago payment ID or other gateway reference';
COMMENT ON COLUMN sales.payment_status IS 'Payment status: pending, approved, rejected, etc.';
COMMENT ON COLUMN sales.payment_details IS 'Full payment payload from gateway (method, amount, payer, etc.)';

-- Create index for webhook lookups by payment_id
CREATE INDEX IF NOT EXISTS idx_sales_payment_id ON sales(payment_id);

