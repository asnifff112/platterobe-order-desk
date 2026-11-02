-- =============================================================================
-- PLATTEROBE ORDER DESK — Production Database Migration
-- =============================================================================
-- Target Database: Supabase / PostgreSQL 14+
-- File: supabase/migrations/001_initial_schema.sql
--
-- Safety & Idempotency:
-- - All tables use CREATE TABLE IF NOT EXISTS.
-- - All indexes use CREATE INDEX IF NOT EXISTS.
-- - All triggers use DROP TRIGGER IF EXISTS followed by CREATE TRIGGER.
-- - All RLS policies use DROP POLICY IF EXISTS followed by CREATE POLICY.
-- - All functions configure an explicit SET search_path = public, pg_temp.
-- - The is_admin() function is STABLE + SECURITY DEFINER with safe search_path.
-- - admin_profiles SELECT policy checks (id = auth.uid() OR is_admin())
--   to completely avoid infinite RLS recursion while securing admin data.
-- - Storage bucket 'invoices' is configured as private with admin-only policies.
-- - Seed data checks WHERE NOT EXISTS to avoid duplicate entries on re-run.
-- =============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================================================
-- 1. ADMIN PROFILES
-- =============================================================================
-- Stores administrator and super-administrator profiles linked to auth.users.
-- Public / self-registration into this table is disabled by RLS.
CREATE TABLE IF NOT EXISTS admin_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL DEFAULT '',
  role TEXT NOT NULL DEFAULT 'admin' CHECK (role IN ('admin', 'super_admin')),
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_profiles_role ON admin_profiles(role);

-- =============================================================================
-- 2. BUSINESS SETTINGS (Singleton configuration row)
-- =============================================================================
CREATE TABLE IF NOT EXISTS business_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_name TEXT NOT NULL DEFAULT 'PLATTEROBE',
  store_display_name TEXT DEFAULT '',
  address TEXT DEFAULT 'Parappanangadi, Kerala, India',
  phone TEXT DEFAULT '',
  email TEXT DEFAULT '',
  logo_url TEXT DEFAULT '',
  currency TEXT NOT NULL DEFAULT 'INR',
  invoice_prefix TEXT NOT NULL DEFAULT 'INV',
  order_prefix TEXT NOT NULL DEFAULT 'ORD',
  invoice_footer TEXT DEFAULT 'Thank you for your order!',
  signatory_image_url TEXT DEFAULT '',
  signatory_name TEXT DEFAULT '',
  show_original_price_on_invoice BOOLEAN NOT NULL DEFAULT FALSE,
  show_delivery_address_on_invoice BOOLEAN NOT NULL DEFAULT TRUE,
  default_payment_method TEXT DEFAULT 'Cash',
  next_invoice_number INTEGER NOT NULL DEFAULT 1,
  next_order_number INTEGER NOT NULL DEFAULT 1,
  whatsapp_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- 3. CUSTOMERS
-- =============================================================================
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  phone_normalized TEXT NOT NULL,
  default_address TEXT DEFAULT '',
  email TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_customers_phone_normalized ON customers(phone_normalized);
CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(name);

-- =============================================================================
-- 4. ORDERS
-- =============================================================================
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number TEXT NOT NULL UNIQUE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
  order_date DATE NOT NULL DEFAULT CURRENT_DATE,
  delivery_date DATE,
  delivery_address TEXT DEFAULT '',
  order_status TEXT NOT NULL DEFAULT 'New'
    CHECK (order_status IN ('New','Confirmed','Preparing','Ready for Delivery','Out for Delivery','Delivered','Cancelled')),
  payment_status TEXT NOT NULL DEFAULT 'Pending'
    CHECK (payment_status IN ('Pending','Partially Paid','Paid','Refunded','Partially Refunded')),
  subtotal_paise INTEGER NOT NULL DEFAULT 0,
  discount_paise INTEGER NOT NULL DEFAULT 0,
  delivery_charge_paise INTEGER NOT NULL DEFAULT 0,
  total_paise INTEGER NOT NULL DEFAULT 0,
  amount_received_paise INTEGER NOT NULL DEFAULT 0,
  balance_due_paise INTEGER NOT NULL DEFAULT 0,
  order_notes TEXT DEFAULT '',
  admin_notes TEXT DEFAULT '',
  created_by UUID REFERENCES admin_profiles(id),
  cancelled_at TIMESTAMPTZ,
  cancelled_reason TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_orders_order_number ON orders(order_number);
CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_order_date ON orders(order_date);
CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON orders(payment_status);
CREATE INDEX IF NOT EXISTS idx_orders_order_status ON orders(order_status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);

-- =============================================================================
-- 5. ORDER ITEMS
-- =============================================================================
CREATE TABLE IF NOT EXISTS order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  original_price_paise INTEGER NOT NULL DEFAULT 0 CHECK (original_price_paise >= 0),
  selling_price_paise INTEGER NOT NULL CHECK (selling_price_paise >= 0),
  line_total_paise INTEGER NOT NULL CHECK (line_total_paise >= 0),
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);

-- =============================================================================
-- 6. PAYMENTS
-- =============================================================================
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE RESTRICT,
  amount_paise INTEGER NOT NULL CHECK (amount_paise > 0),
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  payment_method TEXT NOT NULL DEFAULT 'Cash'
    CHECK (payment_method IN ('UPI','Cash','Bank Transfer','Online Payment','Other')),
  transaction_reference TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  recorded_by UUID REFERENCES admin_profiles(id),
  idempotency_key TEXT UNIQUE,
  is_void BOOLEAN NOT NULL DEFAULT FALSE,
  voided_at TIMESTAMPTZ,
  voided_reason TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payments_order_id ON payments(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_payment_date ON payments(payment_date);
CREATE INDEX IF NOT EXISTS idx_payments_idempotency_key ON payments(idempotency_key);

-- =============================================================================
-- 7. REFUNDS
-- =============================================================================
CREATE TABLE IF NOT EXISTS refunds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE RESTRICT,
  payment_id UUID REFERENCES payments(id),
  amount_paise INTEGER NOT NULL CHECK (amount_paise > 0),
  refund_date DATE NOT NULL DEFAULT CURRENT_DATE,
  reason TEXT NOT NULL DEFAULT '',
  recorded_by UUID REFERENCES admin_profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_refunds_order_id ON refunds(order_id);

-- =============================================================================
-- 8. INVOICES
-- =============================================================================
CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE RESTRICT,
  invoice_number TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  invoice_type TEXT NOT NULL DEFAULT 'standard'
    CHECK (invoice_type IN ('standard','paid','partial','receipt')),
  file_path TEXT DEFAULT '',
  file_url TEXT DEFAULT '',
  -- Payment snapshot at time of invoice generation
  total_paise INTEGER NOT NULL DEFAULT 0,
  amount_received_paise INTEGER NOT NULL DEFAULT 0,
  balance_due_paise INTEGER NOT NULL DEFAULT 0,
  payment_status TEXT NOT NULL DEFAULT 'Pending',
  payment_date DATE,
  payment_method TEXT DEFAULT '',
  generated_by UUID REFERENCES admin_profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invoices_order_id ON invoices(order_id);
CREATE INDEX IF NOT EXISTS idx_invoices_invoice_number ON invoices(invoice_number);
CREATE UNIQUE INDEX IF NOT EXISTS idx_invoices_number_version ON invoices(invoice_number, version);

-- =============================================================================
-- 9. EXPENSES
-- =============================================================================
CREATE TABLE IF NOT EXISTS expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'Other'
    CHECK (category IN ('Ingredients','Packaging','Delivery','Marketing','Equipment','Utilities','Website','Other')),
  amount_paise INTEGER NOT NULL CHECK (amount_paise > 0),
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  payment_method TEXT NOT NULL DEFAULT 'Cash'
    CHECK (payment_method IN ('UPI','Cash','Bank Transfer','Online Payment','Other')),
  vendor TEXT DEFAULT '',
  description TEXT DEFAULT '',
  receipt_url TEXT DEFAULT '',
  recorded_by UUID REFERENCES admin_profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_expenses_expense_date ON expenses(expense_date);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category);

-- =============================================================================
-- 10. AUDIT LOGS
-- =============================================================================
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  action TEXT NOT NULL,
  changes JSONB DEFAULT '{}',
  performed_by UUID REFERENCES admin_profiles(id),
  ip_address TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- =============================================================================
-- 11. WHATSAPP MESSAGES
-- =============================================================================
CREATE TABLE IF NOT EXISTS whatsapp_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
  customer_phone TEXT NOT NULL,
  message_type TEXT NOT NULL DEFAULT 'document',
  whatsapp_message_id TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','sent','delivered','read','failed')),
  error_message TEXT DEFAULT '',
  retry_count INTEGER NOT NULL DEFAULT 0,
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  sent_by UUID REFERENCES admin_profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_order_id ON whatsapp_messages(order_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_status ON whatsapp_messages(status);

-- =============================================================================
-- FUNCTIONS (Hardened with explicit search_path)
-- =============================================================================

-- 1. Helper: Check if current caller is an authenticated administrator
-- Uses SECURITY DEFINER with explicit search_path and STABLE volatility
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_profiles
    WHERE id = auth.uid()
  );
$$;

-- 2. Atomically generate the next invoice number
CREATE OR REPLACE FUNCTION get_next_invoice_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  settings_row public.business_settings%ROWTYPE;
  next_num INTEGER;
  invoice_num TEXT;
BEGIN
  SELECT * INTO settings_row FROM public.business_settings LIMIT 1 FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Business settings not configured';
  END IF;
  
  next_num := settings_row.next_invoice_number;
  
  UPDATE public.business_settings
    SET next_invoice_number = next_num + 1, updated_at = NOW()
    WHERE id = settings_row.id;
  
  invoice_num := settings_row.invoice_prefix || '-' || LPAD(next_num::TEXT, 5, '0');
  RETURN invoice_num;
END;
$$;

-- 3. Atomically generate the next order number
CREATE OR REPLACE FUNCTION get_next_order_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  settings_row public.business_settings%ROWTYPE;
  next_num INTEGER;
  order_num TEXT;
BEGIN
  SELECT * INTO settings_row FROM public.business_settings LIMIT 1 FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Business settings not configured';
  END IF;
  
  next_num := settings_row.next_order_number;
  
  UPDATE public.business_settings
    SET next_order_number = next_num + 1, updated_at = NOW()
    WHERE id = settings_row.id;
  
  order_num := settings_row.order_prefix || '-' || LPAD(next_num::TEXT, 5, '0');
  RETURN order_num;
END;
$$;

-- 4. Atomically recalculate order payment totals, balance due, and payment status
-- Handles partial payments, overpayments, full payments, refunds, and voided payments.
CREATE OR REPLACE FUNCTION recalculate_order_payments(p_order_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_total_received INTEGER;
  v_total_refunded INTEGER;
  v_net_received INTEGER;
  v_order_total INTEGER;
  v_new_balance INTEGER;
  v_new_status TEXT;
BEGIN
  -- Sum non-voided payments for this order
  SELECT COALESCE(SUM(amount_paise), 0) INTO v_total_received
    FROM public.payments
    WHERE order_id = p_order_id AND is_void = FALSE;
    
  -- Sum recorded refunds for this order
  SELECT COALESCE(SUM(amount_paise), 0) INTO v_total_refunded
    FROM public.refunds
    WHERE order_id = p_order_id;
  
  -- Net received paise (clamped to 0 minimum)
  v_net_received := v_total_received - v_total_refunded;
  IF v_net_received < 0 THEN
    v_net_received := 0;
  END IF;
  
  -- Fetch order total
  SELECT total_paise INTO v_order_total
    FROM public.orders
    WHERE id = p_order_id;
  
  IF NOT FOUND THEN
    RETURN;
  END IF;
  
  -- Balance due calculation (clamped to 0 minimum to prevent negative balances on overpayment)
  v_new_balance := v_order_total - v_net_received;
  IF v_new_balance < 0 THEN
    v_new_balance := 0;
  END IF;
  
  -- Status calculation (mirrors TypeScript computePaymentStatus logic exactly)
  IF v_total_refunded > 0 AND v_net_received <= 0 THEN
    v_new_status := 'Refunded';
  ELSIF v_total_refunded > 0 AND v_net_received < v_order_total THEN
    v_new_status := 'Partially Refunded';
  ELSIF v_net_received >= v_order_total AND v_order_total > 0 THEN
    v_new_status := 'Paid';
  ELSIF v_net_received > 0 THEN
    v_new_status := 'Partially Paid';
  ELSE
    v_new_status := 'Pending';
  END IF;
  
  -- Persist recalculated totals
  UPDATE public.orders SET
    amount_received_paise = v_net_received,
    balance_due_paise = v_new_balance,
    payment_status = v_new_status,
    updated_at = NOW()
  WHERE id = p_order_id;
END;
$$;

-- 5. Updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- 6. Trigger function to synchronize order totals when payments or refunds change
CREATE OR REPLACE FUNCTION trg_fn_sync_order_payments()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM recalculate_order_payments(OLD.order_id);
    RETURN OLD;
  ELSE
    PERFORM recalculate_order_payments(NEW.order_id);
    IF TG_OP = 'UPDATE' AND OLD.order_id IS DISTINCT FROM NEW.order_id THEN
      PERFORM recalculate_order_payments(OLD.order_id);
    END IF;
    RETURN NEW;
  END IF;
END;
$$;

-- 7. Trigger function to prevent unauthorized privilege escalation on admin_profiles
CREATE OR REPLACE FUNCTION trg_fn_protect_admin_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Prevent privilege escalation: ordinary admin cannot promote self to super_admin
  IF auth.uid() IS NOT NULL AND OLD.role IS DISTINCT FROM NEW.role THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.admin_profiles
      WHERE id = auth.uid() AND role = 'super_admin'
    ) THEN
      RAISE EXCEPTION 'Only super_administrators can modify user roles';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- =============================================================================
-- TRIGGERS (Idempotent: DROP TRIGGER IF EXISTS followed by CREATE TRIGGER)
-- =============================================================================

DROP TRIGGER IF EXISTS trg_admin_profiles_updated_at ON admin_profiles;
CREATE TRIGGER trg_admin_profiles_updated_at BEFORE UPDATE ON admin_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trg_admin_profiles_role_protect ON admin_profiles;
CREATE TRIGGER trg_admin_profiles_role_protect BEFORE UPDATE ON admin_profiles
  FOR EACH ROW EXECUTE FUNCTION trg_fn_protect_admin_role();

DROP TRIGGER IF EXISTS trg_customers_updated_at ON customers;
CREATE TRIGGER trg_customers_updated_at BEFORE UPDATE ON customers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trg_orders_updated_at ON orders;
CREATE TRIGGER trg_orders_updated_at BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trg_expenses_updated_at ON expenses;
CREATE TRIGGER trg_expenses_updated_at BEFORE UPDATE ON expenses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trg_business_settings_updated_at ON business_settings;
CREATE TRIGGER trg_business_settings_updated_at BEFORE UPDATE ON business_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trg_whatsapp_messages_updated_at ON whatsapp_messages;
CREATE TRIGGER trg_whatsapp_messages_updated_at BEFORE UPDATE ON whatsapp_messages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trg_payments_sync_orders ON payments;
CREATE TRIGGER trg_payments_sync_orders
  AFTER INSERT OR UPDATE OR DELETE ON payments
  FOR EACH ROW EXECUTE FUNCTION trg_fn_sync_order_payments();

DROP TRIGGER IF EXISTS trg_refunds_sync_orders ON refunds;
CREATE TRIGGER trg_refunds_sync_orders
  AFTER INSERT OR UPDATE OR DELETE ON refunds
  FOR EACH ROW EXECUTE FUNCTION trg_fn_sync_order_payments();

-- =============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =============================================================================

-- Enable RLS across all operational and administrative tables
ALTER TABLE admin_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE refunds ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_messages ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------------------------------
-- admin_profiles RLS:
-- - Allows users to read their own profile (enabling requireAdmin() checks without recursion).
-- - Confirmed admins can also view other admin profiles.
-- - Only users can update their own profile name / avatar.
-- - Direct INSERT is disabled for authenticated users: First admin is provisioned via Supabase SQL/Auth.
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS admin_profiles_select ON admin_profiles;
CREATE POLICY admin_profiles_select ON admin_profiles
  FOR SELECT TO authenticated
  USING (id = auth.uid() OR is_admin());

DROP POLICY IF EXISTS admin_profiles_update ON admin_profiles;
CREATE POLICY admin_profiles_update ON admin_profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- -----------------------------------------------------------------------------
-- business_settings RLS: Administrators only
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS business_settings_select ON business_settings;
CREATE POLICY business_settings_select ON business_settings
  FOR SELECT TO authenticated
  USING (is_admin());

DROP POLICY IF EXISTS business_settings_update ON business_settings;
CREATE POLICY business_settings_update ON business_settings
  FOR UPDATE TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

DROP POLICY IF EXISTS business_settings_insert ON business_settings;
CREATE POLICY business_settings_insert ON business_settings
  FOR INSERT TO authenticated
  WITH CHECK (is_admin() AND NOT EXISTS (SELECT 1 FROM public.business_settings));

-- -----------------------------------------------------------------------------
-- Operational tables RLS: Full access restricted exclusively to admins
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS customers_all ON customers;
CREATE POLICY customers_all ON customers
  FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

DROP POLICY IF EXISTS orders_all ON orders;
CREATE POLICY orders_all ON orders
  FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

DROP POLICY IF EXISTS order_items_all ON order_items;
CREATE POLICY order_items_all ON order_items
  FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

DROP POLICY IF EXISTS payments_all ON payments;
CREATE POLICY payments_all ON payments
  FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

DROP POLICY IF EXISTS refunds_all ON refunds;
CREATE POLICY refunds_all ON refunds
  FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

DROP POLICY IF EXISTS invoices_all ON invoices;
CREATE POLICY invoices_all ON invoices
  FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

DROP POLICY IF EXISTS expenses_all ON expenses;
CREATE POLICY expenses_all ON expenses
  FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

DROP POLICY IF EXISTS audit_logs_select ON audit_logs;
CREATE POLICY audit_logs_select ON audit_logs
  FOR SELECT TO authenticated
  USING (is_admin());

DROP POLICY IF EXISTS audit_logs_insert ON audit_logs;
CREATE POLICY audit_logs_insert ON audit_logs
  FOR INSERT TO authenticated
  WITH CHECK (is_admin());

DROP POLICY IF EXISTS whatsapp_messages_all ON whatsapp_messages;
CREATE POLICY whatsapp_messages_all ON whatsapp_messages
  FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- =============================================================================
-- FUNCTION EXECUTION PRIVILEGES
-- =============================================================================
-- Lock down RPC functions: revoke public access, grant only to authenticated & service_role
REVOKE ALL ON FUNCTION is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION is_admin() TO authenticated, service_role;

REVOKE ALL ON FUNCTION get_next_invoice_number() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_next_invoice_number() TO authenticated, service_role;

REVOKE ALL ON FUNCTION get_next_order_number() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_next_order_number() TO authenticated, service_role;

REVOKE ALL ON FUNCTION recalculate_order_payments(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION recalculate_order_payments(UUID) TO authenticated, service_role;

-- =============================================================================
-- STORAGE CONFIGURATION (Private Invoices Bucket & Storage RLS)
-- =============================================================================
-- Ensure storage bucket 'invoices' exists as private (public = false)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'invoices',
  'invoices',
  false,
  10485760, -- 10MB limit per PDF
  ARRAY['application/pdf']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Storage Policies for 'invoices' bucket: Admins only
DROP POLICY IF EXISTS "invoices_bucket_select" ON storage.objects;
CREATE POLICY "invoices_bucket_select"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (bucket_id = 'invoices' AND is_admin());

DROP POLICY IF EXISTS "invoices_bucket_insert" ON storage.objects;
CREATE POLICY "invoices_bucket_insert"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'invoices' AND is_admin());

DROP POLICY IF EXISTS "invoices_bucket_update" ON storage.objects;
CREATE POLICY "invoices_bucket_update"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (bucket_id = 'invoices' AND is_admin())
  WITH CHECK (bucket_id = 'invoices' AND is_admin());

DROP POLICY IF EXISTS "invoices_bucket_delete" ON storage.objects;
CREATE POLICY "invoices_bucket_delete"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'invoices' AND is_admin());

-- =============================================================================
-- DEFAULT BUSINESS SETTINGS SEED (Idempotent: runs only if table is empty)
-- =============================================================================
INSERT INTO public.business_settings (
  business_name,
  store_display_name,
  address,
  phone,
  email,
  currency,
  invoice_prefix,
  order_prefix,
  invoice_footer,
  signatory_name,
  show_original_price_on_invoice,
  show_delivery_address_on_invoice,
  default_payment_method
)
SELECT
  'PLATTEROBE',
  'PLATTEROBE Gourmet & Catering',
  'Main Road, Parappanangadi, Kerala, India',
  '+91 98460 12345',
  'orders@platterobe.com',
  'INR',
  'INV',
  'ORD',
  'Thank you for choosing PLATTEROBE! Enjoy your meal.',
  'Authorized Signatory',
  FALSE,
  TRUE,
  'UPI'
WHERE NOT EXISTS (SELECT 1 FROM public.business_settings);

-- =============================================================================
-- HOW TO PROVISION THE FIRST ADMINISTRATOR (INSTRUCTIONS)
-- =============================================================================
-- Because self-registration is blocked on admin_profiles, an administrator
-- cannot be created via ordinary public signup.
--
-- Steps to create the first administrator:
-- 1. In your Supabase Project Dashboard:
--    Navigate to: Authentication -> Users -> Click "Add user" -> "Create user"
--    Enter the administrator's email and a secure temporary/permanent password.
--    Click "Create user".
-- 2. Click the newly created user in the Users table and copy their "User UID" (UUID).
-- 3. Open Supabase SQL Editor and execute:
--
--    INSERT INTO public.admin_profiles (id, email, full_name, role)
--    VALUES (
--      '00000000-0000-0000-0000-000000000000', -- <-- REPLACE WITH COPIED USER UID
--      'admin@platterobe.com',                 -- <-- REPLACE WITH USER EMAIL
--      'Primary Administrator',
--      'super_admin'
--    )
--    ON CONFLICT (id) DO UPDATE SET
--      role = 'super_admin',
--      updated_at = NOW();
--
-- Once executed, this user can log into PLATTEROBE ORDER DESK with full access.
-- =============================================================================
