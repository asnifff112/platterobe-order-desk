import { z } from 'zod';

// --- Order Item ---
export const orderItemSchema = z.object({
  product_name: z.string().min(1, 'Product name is required').max(200),
  quantity: z.number().int().min(1, 'Quantity must be at least 1'),
  original_price: z.number().min(0, 'Price cannot be negative'),
  selling_price: z.number().min(0, 'Price cannot be negative'),
});

// --- Create Order ---
export const createOrderSchema = z.object({
  customer_name: z.string().min(1, 'Customer name is required').max(200),
  customer_phone: z
    .string()
    .min(10, 'Phone number must be at least 10 digits')
    .max(15, 'Phone number is too long')
    .regex(/^[+\d\s\-()]+$/, 'Invalid phone number format'),
  order_date: z.string().min(1, 'Order date is required'),
  delivery_date: z.string().optional().default(''),
  delivery_address: z.string().optional().default(''),
  order_notes: z.string().optional().default(''),
  admin_notes: z.string().optional().default(''),
  items: z.array(orderItemSchema).min(1, 'At least one item is required'),
  discount: z.number().min(0, 'Discount cannot be negative').optional().default(0),
  delivery_charge: z.number().min(0, 'Delivery charge cannot be negative').optional().default(0),
});

// --- Record Payment ---
export const recordPaymentSchema = z.object({
  order_id: z.string().uuid(),
  amount: z.number().positive('Amount must be greater than zero'),
  payment_date: z.string().min(1, 'Payment date is required'),
  payment_method: z.enum(['UPI', 'Cash', 'Bank Transfer', 'Online Payment', 'Other']),
  transaction_reference: z.string().optional().default(''),
  notes: z.string().optional().default(''),
  idempotency_key: z.string().min(1, 'Idempotency key is required'),
});

// --- Create Expense ---
export const createExpenseSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  category: z.enum([
    'Ingredients', 'Packaging', 'Delivery', 'Marketing',
    'Equipment', 'Utilities', 'Website', 'Other',
  ]),
  amount: z.number().positive('Amount must be greater than zero'),
  expense_date: z.string().min(1, 'Date is required'),
  payment_method: z.enum(['UPI', 'Cash', 'Bank Transfer', 'Online Payment', 'Other']),
  vendor: z.string().optional().default(''),
  description: z.string().optional().default(''),
});

// --- Login ---
export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

// --- Business Settings ---
export const businessSettingsSchema = z.object({
  business_name: z.string().min(1, 'Business name is required'),
  store_display_name: z.string().optional().default(''),
  address: z.string().optional().default(''),
  phone: z.string().optional().default(''),
  email: z.string().email().optional().or(z.literal('')),
  invoice_prefix: z.string().min(1).max(10),
  order_prefix: z.string().min(1).max(10),
  invoice_footer: z.string().optional().default(''),
  signatory_name: z.string().optional().default(''),
  show_original_price_on_invoice: z.boolean(),
  show_delivery_address_on_invoice: z.boolean(),
  default_payment_method: z.string().optional().default('Cash'),
});

// --- Update Order Status ---
export const updateOrderStatusSchema = z.object({
  order_id: z.string().uuid(),
  order_status: z.enum([
    'New', 'Confirmed', 'Preparing', 'Ready for Delivery',
    'Out for Delivery', 'Delivered', 'Cancelled',
  ]),
  cancelled_reason: z.string().optional().default(''),
});

// --- Record Refund ---
export const recordRefundSchema = z.object({
  order_id: z.string().uuid(),
  payment_id: z.string().uuid().optional(),
  amount: z.number().positive('Amount must be greater than zero'),
  refund_date: z.string().min(1, 'Refund date is required'),
  reason: z.string().min(1, 'Reason is required'),
});

// Types inferred from schemas
export type CreateOrderFormData = z.infer<typeof createOrderSchema>;
export type RecordPaymentFormData = z.infer<typeof recordPaymentSchema>;
export type CreateExpenseFormData = z.infer<typeof createExpenseSchema>;
export type LoginFormData = z.infer<typeof loginSchema>;
export type BusinessSettingsFormData = z.infer<typeof businessSettingsSchema>;
export type UpdateOrderStatusFormData = z.infer<typeof updateOrderStatusSchema>;
export type RecordRefundFormData = z.infer<typeof recordRefundSchema>;
