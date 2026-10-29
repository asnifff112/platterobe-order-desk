-- =============================================================================
-- PLATTEROBE ORDER DESK — Database Migration
-- =============================================================================
-- Run this in your Supabase SQL Editor (or via supabase db push).
-- This creates all tables, indexes, RLS policies, and functions.
-- =============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================================
-- 1. ADMIN PROFILES
-- =============================================================================
CREATE TABLE IF NOT EXISTS admin_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL DEFAULT '',
  role TEXT NOT NULL DEFAULT 'admin' CHECK (role IN ('admin', 'super_admin')),
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- 2. BUSINESS SETTINGS (singleton row)
-- =============================================================================
CREATE TABLE IF NOT EXISTS business_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entity_type TEXT NOT NULL,  -- 'order', 'payment', 'invoice', 'expense', 'customer', 'settings'
  entity_id UUID NOT NULL,
  action TEXT NOT NULL,       -- 'created', 'updated', 'cancelled', 'payment_recorded', etc.
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
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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
-- FUNCTIONS
-- =============================================================================

-- Function to get next invoice number atomically
CREATE OR REPLACE FUNCTION get_next_invoice_number()
RETURNS TEXT AS $$
DECLARE
  settings_row business_settings%ROWTYPE;
  next_num INTEGER;
  invoice_num TEXT;
BEGIN
  SELECT * INTO settings_row FROM business_settings LIMIT 1 FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Business settings not configured';
  END IF;
  
  next_num := settings_row.next_invoice_number;
  
  UPDATE business_settings
    SET next_invoice_number = next_num + 1, updated_at = NOW()
    WHERE id = settings_row.id;
  
  invoice_num := settings_row.invoice_prefix || '-' || LPAD(next_num::TEXT, 5, '0');
  RETURN invoice_num;
END;
$$ LANGUAGE plpgsql;

-- Function to get next order number atomically
CREATE OR REPLACE FUNCTION get_next_order_number()
RETURNS TEXT AS $$
DECLARE
  settings_row business_settings%ROWTYPE;
  next_num INTEGER;
  order_num TEXT;
BEGIN
  SELECT * INTO settings_row FROM business_settings LIMIT 1 FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Business settings not configured';
  END IF;
  
  next_num := settings_row.next_order_number;
  
  UPDATE business_settings
    SET next_order_number = next_num + 1, updated_at = NOW()
    WHERE id = settings_row.id;
  
  order_num := settings_row.order_prefix || '-' || LPAD(next_num::TEXT, 5, '0');
  RETURN order_num;
END;
$$ LANGUAGE plpgsql;

-- Function to recalculate order payment summary
CREATE OR REPLACE FUNCTION recalculate_order_payments(p_order_id UUID)
RETURNS VOID AS $$
DECLARE
  total_received INTEGER;
  total_refunded INTEGER;
  net_received INTEGER;
  order_total INTEGER;
  new_balance INTEGER;
  new_status TEXT;
BEGIN
  SELECT COALESCE(SUM(amount_paise), 0) INTO total_received
    FROM payments WHERE order_id = p_order_id AND is_void = FALSE;
    
  SELECT COALESCE(SUM(amount_paise), 0) INTO total_refunded
    FROM refunds WHERE order_id = p_order_id;
  
  net_received := total_received - total_refunded;
  
  SELECT total_paise INTO order_total FROM orders WHERE id = p_order_id;
  
  new_balance := order_total - net_received;
  IF new_balance < 0 THEN new_balance := 0; END IF;
  
  IF total_refunded > 0 AND net_received <= 0 THEN
    new_status := 'Refunded';
  ELSIF total_refunded > 0 AND net_received < order_total THEN
    new_status := 'Partially Refunded';
  ELSIF net_received >= order_total THEN
    new_status := 'Paid';
  ELSIF net_received > 0 THEN
    new_status := 'Partially Paid';
  ELSE
    new_status := 'Pending';
  END IF;
  
  UPDATE orders SET
    amount_received_paise = net_received,
    balance_due_paise = new_balance,
    payment_status = new_status,
    updated_at = NOW()
  WHERE id = p_order_id;
END;
$$ LANGUAGE plpgsql;

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
CREATE TRIGGER trg_admin_profiles_updated_at BEFORE UPDATE ON admin_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_customers_updated_at BEFORE UPDATE ON customers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_orders_updated_at BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_expenses_updated_at BEFORE UPDATE ON expenses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_business_settings_updated_at BEFORE UPDATE ON business_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_whatsapp_messages_updated_at BEFORE UPDATE ON whatsapp_messages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

-- Enable RLS on all tables
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

-- Helper: check if the current user is an admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM admin_profiles WHERE id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS policies — all tables accessible only to authenticated admins

-- admin_profiles
CREATE POLICY admin_profiles_select ON admin_profiles FOR SELECT TO authenticated USING (is_admin());
CREATE POLICY admin_profiles_update ON admin_profiles FOR UPDATE TO authenticated USING (id = auth.uid());

-- business_settings
CREATE POLICY business_settings_select ON business_settings FOR SELECT TO authenticated USING (is_admin());
CREATE POLICY business_settings_update ON business_settings FOR UPDATE TO authenticated USING (is_admin());
CREATE POLICY business_settings_insert ON business_settings FOR INSERT TO authenticated WITH CHECK (is_admin());

-- customers
CREATE POLICY customers_all ON customers FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- orders
CREATE POLICY orders_all ON orders FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- order_items
CREATE POLICY order_items_all ON order_items FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- payments
CREATE POLICY payments_all ON payments FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- refunds
CREATE POLICY refunds_all ON refunds FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- invoices
CREATE POLICY invoices_all ON invoices FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- expenses
CREATE POLICY expenses_all ON expenses FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- audit_logs
CREATE POLICY audit_logs_select ON audit_logs FOR SELECT TO authenticated USING (is_admin());
CREATE POLICY audit_logs_insert ON audit_logs FOR INSERT TO authenticated WITH CHECK (is_admin());

-- whatsapp_messages
CREATE POLICY whatsapp_messages_all ON whatsapp_messages FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- =============================================================================
-- SEED DEFAULT BUSINESS SETTINGS
-- =============================================================================
INSERT INTO business_settings (
  business_name, store_display_name, address, phone, currency,
  invoice_prefix, order_prefix, invoice_footer
) VALUES (
  'PLATTEROBE', 'PLATTEROBE', 'Parappanangadi, Kerala, India', '', 'INR',
  'INV', 'ORD', 'Thank you for your order!'
) ON CONFLICT DO NOTHING;

-- =============================================================================
-- STORAGE BUCKET
-- =============================================================================
-- Run this separately in the Supabase dashboard or via the API:
-- INSERT INTO storage.buckets (id, name, public) VALUES ('invoices', 'invoices', false);
-- Then add storage policies for authenticated users only.
