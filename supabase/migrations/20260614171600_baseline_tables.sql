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
