-- =============================================================================
-- PLATTEROBE ORDER DESK — Optional Demo Seed Script
-- =============================================================================
-- Run this in your Supabase SQL Editor if you want sample data for testing.
-- Make sure 001_initial_schema.sql has already been run.
-- =============================================================================

-- 1. Ensure Business Settings exist
INSERT INTO business_settings (
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
  default_payment_method,
  next_invoice_number,
  next_order_number,
  whatsapp_enabled
) VALUES (
  'PLATTEROBE',
  'PLATTEROBE Gourmet & Catering',
  'Main Road, Parappanangadi, Malappuram, Kerala 676303',
  '+91 98460 12345',
  'orders@platterobe.com',
  'INR',
  'INV',
  'ORD',
  'Thank you for dining with PLATTEROBE! For inquiries, call +91 98460 12345.',
  'Authorized Signatory',
  false,
  true,
  'UPI',
  1006,
  1006,
  false
) ON CONFLICT (id) DO UPDATE SET
  business_name = EXCLUDED.business_name,
  store_display_name = EXCLUDED.store_display_name,
  address = EXCLUDED.address;

-- 2. Sample Customers in Parappanangadi / Kerala
INSERT INTO customers (id, name, phone, phone_normalized, default_address, email, notes) VALUES
('c1111111-1111-1111-1111-111111111111', 'Fathima Zahra', '+91 94471 23456', '919447123456', 'Rose Villa, Near Railway Station, Parappanangadi', 'fathima.z@example.com', 'Prefers contactless delivery'),
('c2222222-2222-2222-2222-222222222222', 'Muhammed Nihal', '9847234567', '919847234567', 'Nihal Manzil, Beach Road, Parappanangadi', 'nihal@example.com', 'Regular catering customer'),
('c3333333-3333-3333-3333-333333333333', 'Ananya Krishnan', '+91 97453 45678', '919745345678', 'Krishnakripa, College Road, Tirurangadi', 'ananya.k@example.com', 'Spice sensitive, mild food only'),
('c4444444-4444-4444-4444-444444444444', 'Abdul Rahman', '9633123890', '919633123890', 'Baitul Noor, Chemmad, Kerala', 'rahman@example.com', 'Family meal box subscriber')
ON CONFLICT (phone_normalized) DO NOTHING;

-- 3. Sample Orders
-- Order 1: Delivered & Paid
INSERT INTO orders (
  id, order_number, customer_id, order_date, delivery_date, delivery_address,
  order_status, payment_status, subtotal_paise, discount_paise, delivery_charge_paise,
  total_paise, amount_received_paise, balance_due_paise, order_notes, admin_notes
) VALUES (
  'o1111111-1111-1111-1111-111111111111',
  'ORD-01001',
  'c1111111-1111-1111-1111-111111111111',
  CURRENT_DATE - INTERVAL '3 days',
  CURRENT_DATE - INTERVAL '3 days',
  'Rose Villa, Near Railway Station, Parappanangadi',
  'Delivered',
  'Paid',
  185000, -- 1850 INR
  10000,  -- 100 INR discount
  5000,   -- 50 INR delivery
  180000, -- 1800 INR total
  180000, -- 1800 INR paid
  0,      -- 0 balance
  'Please include extra mint dip',
  'First order discount applied'
) ON CONFLICT (order_number) DO NOTHING;

-- Items for Order 1
INSERT INTO order_items (order_id, product_name, quantity, original_price_paise, selling_price_paise, line_total_paise, sort_order) VALUES
('o1111111-1111-1111-1111-111111111111', 'Signature Chicken Dum Biryani (Family Pack)', 2, 70000, 65000, 130000, 1),
('o1111111-1111-1111-1111-111111111111', 'Malabar Mutton Roast', 1, 45000, 40000, 40000, 2),
('o1111111-1111-1111-1111-111111111111', 'Kulukki Sarbath (Set of 3)', 1, 15000, 15000, 15000, 3)
ON CONFLICT DO NOTHING;

-- Payment for Order 1
INSERT INTO payments (
  id, order_id, amount_paise, payment_date, payment_method, transaction_reference, notes, idempotency_key
) VALUES (
  'p1111111-1111-1111-1111-111111111111',
  'o1111111-1111-1111-1111-111111111111',
  180000,
  CURRENT_DATE - INTERVAL '3 days',
  'UPI',
  'UPI/412389104812/GPay',
  'Full payment received via Google Pay UPI',
  'seed-pay-01001'
) ON CONFLICT (idempotency_key) DO NOTHING;

-- Invoice for Order 1 (Version 2 - Paid)
INSERT INTO invoices (
  id, order_id, invoice_number, version, invoice_type,
  total_paise, amount_received_paise, balance_due_paise,
  payment_status, payment_date, payment_method
) VALUES (
  'i1111111-1111-1111-1111-111111111111',
  'o1111111-1111-1111-1111-111111111111',
  'INV-01001',
  2,
  'paid',
  180000,
  180000,
  0,
  'Paid',
  CURRENT_DATE - INTERVAL '3 days',
  'UPI'
) ON CONFLICT DO NOTHING;

-- Order 2: Confirmed & Partially Paid
INSERT INTO orders (
  id, order_number, customer_id, order_date, delivery_date, delivery_address,
  order_status, payment_status, subtotal_paise, discount_paise, delivery_charge_paise,
  total_paise, amount_received_paise, balance_due_paise, order_notes, admin_notes
) VALUES (
  'o2222222-2222-2222-2222-222222222222',
  'ORD-01002',
  'c2222222-2222-2222-2222-222222222222',
  CURRENT_DATE - INTERVAL '1 days',
  CURRENT_DATE,
  'Nihal Manzil, Beach Road, Parappanangadi',
  'Preparing',
  'Partially Paid',
  420000, -- 4200 INR
  0,
  10000,  -- 100 INR delivery
  430000, -- 4300 INR total
  200000, -- 2000 INR advance paid
  230000, -- 2300 INR balance
  'Party platter order for 15 guests',
  'Advance paid via UPI, remaining on delivery'
) ON CONFLICT (order_number) DO NOTHING;

-- Items for Order 2
INSERT INTO order_items (order_id, product_name, quantity, original_price_paise, selling_price_paise, line_total_paise, sort_order) VALUES
('o2222222-2222-2222-2222-222222222222', 'Grand Arabian Mandi Platter (Serves 8)', 1, 260000, 240000, 240000, 1),
('o2222222-2222-2222-2222-222222222222', 'Special Grilled Pepper Chicken', 3, 40000, 36000, 108000, 2),
('o2222222-2222-2222-2222-222222222222', 'Dessert Jar Collection (Pack of 6)', 1, 72000, 72000, 72000, 3)
ON CONFLICT DO NOTHING;

-- Advance Payment for Order 2
INSERT INTO payments (
  id, order_id, amount_paise, payment_date, payment_method, transaction_reference, notes, idempotency_key
) VALUES (
  'p2222222-2222-2222-2222-222222222222',
  'o2222222-2222-2222-2222-222222222222',
  200000,
  CURRENT_DATE - INTERVAL '1 days',
  'UPI',
  'UPI/412399881122/PhonePe',
  'Advance token payment',
  'seed-pay-01002'
) ON CONFLICT (idempotency_key) DO NOTHING;

-- Invoice for Order 2 (Version 1 - Partial)
INSERT INTO invoices (
  id, order_id, invoice_number, version, invoice_type,
  total_paise, amount_received_paise, balance_due_paise,
  payment_status, payment_date, payment_method
) VALUES (
  'i2222222-2222-2222-2222-222222222222',
  'o2222222-2222-2222-2222-222222222222',
  'INV-01002',
  1,
  'partial',
  430000,
  200000,
  230000,
  'Partially Paid',
  CURRENT_DATE - INTERVAL '1 days',
  'UPI'
) ON CONFLICT DO NOTHING;

-- Order 3: New & Pending
INSERT INTO orders (
  id, order_number, customer_id, order_date, delivery_date, delivery_address,
  order_status, payment_status, subtotal_paise, discount_paise, delivery_charge_paise,
  total_paise, amount_received_paise, balance_due_paise, order_notes, admin_notes
) VALUES (
  'o3333333-3333-3333-3333-333333333333',
  'ORD-01003',
  'c3333333-3333-3333-3333-333333333333',
  CURRENT_DATE,
  CURRENT_DATE,
  'Krishnakripa, College Road, Tirurangadi',
  'New',
  'Pending',
  98000,  -- 980 INR
  0,
  6000,   -- 60 INR delivery
  104000, -- 1040 INR total
  0,
  104000, -- 1040 INR due
  'Deliver around 7:30 PM evening',
  ''
) ON CONFLICT (order_number) DO NOTHING;

-- Items for Order 3
INSERT INTO order_items (order_id, product_name, quantity, original_price_paise, selling_price_paise, line_total_paise, sort_order) VALUES
('o3333333-3333-3333-3333-333333333333', 'Kerala Ghee Rice with Beef Kuruma', 2, 38000, 35000, 70000, 1),
('o3333333-3333-3333-3333-333333333333', 'Tender Coconut Souffle', 2, 15000, 14000, 28000, 2)
ON CONFLICT DO NOTHING;

-- 4. Sample Expenses
INSERT INTO expenses (title, category, amount_paise, expense_date, payment_method, vendor, description) VALUES
('Basmati Rice & Spices Bulk Purchase', 'Ingredients', 1250000, CURRENT_DATE - INTERVAL '5 days', 'Bank Transfer', 'Malabar Agro Traders, Kozhikode', '50kg Dawat Basmati Rice & authentic Malabar spices'),
('Custom Kraft Food Delivery Boxes', 'Packaging', 480000, CURRENT_DATE - INTERVAL '4 days', 'UPI', 'EcoPack Solutions, Tirur', '300 sets of meal boxes and foil wraps'),
('Weekly Kitchen Gas Refill', 'Utilities', 360000, CURRENT_DATE - INTERVAL '2 days', 'Cash', 'Parappanangadi Indane Agency', '2 commercial 19kg gas cylinders'),
('Local Bike Delivery Fuel Reimbursement', 'Delivery', 140000, CURRENT_DATE - INTERVAL '1 days', 'Cash', 'Delivery Staff - Rahul', 'Weekly petrol allowance for home delivery runs')
ON CONFLICT DO NOTHING;
