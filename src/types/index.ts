// =============================================================================
// PLATTEROBE ORDER DESK — Database Types
// =============================================================================

// Monetary values are stored as INTEGER paise (1 INR = 100 paise)
// Use the helper functions in utils/currency.ts for conversion

export type OrderStatus =
  | 'New'
  | 'Confirmed'
  | 'Preparing'
  | 'Ready for Delivery'
  | 'Out for Delivery'
  | 'Delivered'
  | 'Cancelled';

export type PaymentStatus =
  | 'Pending'
  | 'Partially Paid'
  | 'Paid'
  | 'Refunded'
  | 'Partially Refunded';

export type PaymentMethod =
  | 'UPI'
  | 'Cash'
  | 'Bank Transfer'
  | 'Online Payment'
  | 'Other';

export type ExpenseCategory =
  | 'Ingredients'
  | 'Packaging'
  | 'Delivery'
  | 'Marketing'
  | 'Equipment'
  | 'Utilities'
  | 'Website'
  | 'Other';

export type InvoiceType =
  | 'standard'
  | 'paid'
  | 'partial'
  | 'receipt';

export type WhatsAppMessageStatus =
  | 'pending'
  | 'sent'
  | 'delivered'
  | 'read'
  | 'failed';

// --- Database Row Types ---

export interface AdminProfile {
  id: string;
  email: string;
  full_name: string;
  role: 'admin' | 'super_admin';
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface BusinessSettings {
  id: string;
  business_name: string;
  store_display_name: string;
  address: string;
  phone: string;
  email: string;
  logo_url: string;
  currency: string;
  invoice_prefix: string;
  order_prefix: string;
  invoice_footer: string;
  signatory_image_url: string;
  signatory_name: string;
  show_original_price_on_invoice: boolean;
  show_delivery_address_on_invoice: boolean;
  default_payment_method: string;
  next_invoice_number: number;
  next_order_number: number;
  whatsapp_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  phone_normalized: string;
  default_address: string;
  email: string;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface Order {
  id: string;
  order_number: string;
  customer_id: string;
  order_date: string;
  delivery_date: string | null;
  delivery_address: string;
  order_status: OrderStatus;
  payment_status: PaymentStatus;
  subtotal_paise: number;
  discount_paise: number;
  delivery_charge_paise: number;
  total_paise: number;
  amount_received_paise: number;
  balance_due_paise: number;
  order_notes: string;
  admin_notes: string;
  created_by: string | null;
  cancelled_at: string | null;
  cancelled_reason: string;
  created_at: string;
  updated_at: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_name: string;
  quantity: number;
  original_price_paise: number;
  selling_price_paise: number;
  line_total_paise: number;
  sort_order: number;
  created_at: string;
}

export interface Payment {
  id: string;
  order_id: string;
  amount_paise: number;
  payment_date: string;
  payment_method: PaymentMethod;
  transaction_reference: string;
  notes: string;
  recorded_by: string | null;
  idempotency_key: string | null;
  is_void: boolean;
  voided_at: string | null;
  voided_reason: string;
  created_at: string;
}

export interface Refund {
  id: string;
  order_id: string;
  payment_id: string | null;
  amount_paise: number;
  refund_date: string;
  reason: string;
  recorded_by: string | null;
  created_at: string;
}

export interface Invoice {
  id: string;
  order_id: string;
  invoice_number: string;
  version: number;
  invoice_type: InvoiceType;
  file_path: string;
  file_url: string;
  total_paise: number;
  amount_received_paise: number;
  balance_due_paise: number;
  payment_status: string;
  payment_date: string | null;
  payment_method: string;
  generated_by: string | null;
  created_at: string;
}

export interface Expense {
  id: string;
  title: string;
  category: ExpenseCategory;
  amount_paise: number;
  expense_date: string;
  payment_method: PaymentMethod;
  vendor: string;
  description: string;
  receipt_url: string;
  recorded_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface AuditLog {
  id: string;
  entity_type: string;
  entity_id: string;
  action: string;
  changes: Record<string, unknown>;
  performed_by: string | null;
  ip_address: string;
  created_at: string;
}

export interface WhatsAppMessage {
  id: string;
  order_id: string | null;
  invoice_id: string | null;
  customer_phone: string;
  message_type: string;
  whatsapp_message_id: string;
  status: WhatsAppMessageStatus;
  error_message: string;
  retry_count: number;
  sent_at: string | null;
  delivered_at: string | null;
  read_at: string | null;
  sent_by: string | null;
  created_at: string;
  updated_at: string;
}

// --- Extended types with joins ---

export interface OrderWithCustomer extends Order {
  customer: Customer;
}

export interface OrderWithDetails extends OrderWithCustomer {
  items: OrderItem[];
  payments: Payment[];
  invoices: Invoice[];
}

export interface CustomerWithStats extends Customer {
  total_orders: number;
  total_spent_paise: number;
  outstanding_balance_paise: number;
  last_order_date: string | null;
}

// --- Dashboard Metrics ---

export interface DashboardMetrics {
  total_orders: number;
  todays_orders: number;
  total_order_value_paise: number;
  total_payments_received_paise: number;
  pending_payments_paise: number;
  outstanding_balance_paise: number;
  paid_orders: number;
  pending_orders: number;
}

// --- Form / Input Types ---

export interface OrderItemInput {
  product_name: string;
  quantity: number;
  original_price: number;  // in rupees, converted to paise on submit
  selling_price: number;   // in rupees, converted to paise on submit
}

export interface CreateOrderInput {
  customer_name: string;
  customer_phone: string;
  order_date: string;
  delivery_date?: string;
  delivery_address?: string;
  order_notes?: string;
  admin_notes?: string;
  items: OrderItemInput[];
  discount?: number;        // in rupees
  delivery_charge?: number;  // in rupees
}

export interface RecordPaymentInput {
  order_id: string;
  amount: number;  // in rupees
  payment_date: string;
  payment_method: PaymentMethod;
  transaction_reference?: string;
  notes?: string;
  idempotency_key: string;
}

export interface CreateExpenseInput {
  title: string;
  category: ExpenseCategory;
  amount: number;  // in rupees
  expense_date: string;
  payment_method: PaymentMethod;
  vendor?: string;
  description?: string;
}
