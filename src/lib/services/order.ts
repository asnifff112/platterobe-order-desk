import { SupabaseClient } from '@supabase/supabase-js';
import { rupeesToPaise } from '@/lib/utils/currency';
import { normalizePhone } from '@/lib/utils/phone';
import type { CreateOrderInput, PaymentStatus } from '@/types';

export interface CalculatedOrder {
  subtotal_paise: number;
  discount_paise: number;
  delivery_charge_paise: number;
  total_paise: number;
  items: Array<{
    product_name: string;
    quantity: number;
    original_price_paise: number;
    selling_price_paise: number;
    line_total_paise: number;
    sort_order: number;
  }>;
}

/**
 * Pure calculation function for order items and totals.
 * All monetary values are handled in paise (integers).
 */
export function calculateOrderTotals(input: {
  items: CreateOrderInput['items'];
  discount?: number;
  delivery_charge?: number;
}): CalculatedOrder {
  const discount_paise = rupeesToPaise(input.discount || 0);
  const delivery_charge_paise = rupeesToPaise(input.delivery_charge || 0);

  let subtotal_paise = 0;

  const items = input.items.map((item, index) => {
    const original_price_paise = rupeesToPaise(item.original_price || item.selling_price);
    const selling_price_paise = rupeesToPaise(item.selling_price);
    const line_total_paise = selling_price_paise * item.quantity;

    subtotal_paise += line_total_paise;

    return {
      product_name: item.product_name.trim(),
      quantity: item.quantity,
      original_price_paise,
      selling_price_paise,
      line_total_paise,
      sort_order: index + 1,
    };
  });

  const total_paise = Math.max(0, subtotal_paise - discount_paise + delivery_charge_paise);

  return {
    subtotal_paise,
    discount_paise,
    delivery_charge_paise,
    total_paise,
    items,
  };
}

/**
 * Determine payment status given total and net amount received
 */
export function computePaymentStatus(
  total_paise: number,
  net_received_paise: number,
  refunded_paise: number = 0
): PaymentStatus {
  if (refunded_paise > 0 && net_received_paise <= 0) {
    return 'Refunded';
  }
  if (refunded_paise > 0 && net_received_paise < total_paise) {
    return 'Partially Refunded';
  }
  if (net_received_paise >= total_paise && total_paise > 0) {
    return 'Paid';
  }
  if (net_received_paise > 0) {
    return 'Partially Paid';
  }
  return 'Pending';
}

/**
 * Get or create customer by phone number.
 * Normalizes phone number to 91XXXXXXXXXX.
 */
export async function getOrCreateCustomer(
  supabase: SupabaseClient,
  customerData: {
    name: string;
    phone: string;
    default_address?: string;
    email?: string;
  }
) {
  const phone_normalized = normalizePhone(customerData.phone);

  // Check if customer already exists
  const { data: existingCustomer, error: fetchError } = await supabase
    .from('customers')
    .select('*')
    .eq('phone_normalized', phone_normalized)
    .maybeSingle();

  if (fetchError) {
    throw new Error(`Failed to query customer: ${fetchError.message}`);
  }

  if (existingCustomer) {
    // Update name or address if provided and not set
    const updates: Record<string, string> = {};
    if (customerData.name && customerData.name !== existingCustomer.name) {
      updates.name = customerData.name;
    }
    if (customerData.default_address && !existingCustomer.default_address) {
      updates.default_address = customerData.default_address;
    }
    if (customerData.email && !existingCustomer.email) {
      updates.email = customerData.email;
    }

    if (Object.keys(updates).length > 0) {
      await supabase
        .from('customers')
        .update(updates)
        .eq('id', existingCustomer.id);
    }

    return existingCustomer;
  }

  // Insert new customer
  const { data: newCustomer, error: insertError } = await supabase
    .from('customers')
    .insert({
      name: customerData.name.trim(),
      phone: customerData.phone.trim(),
      phone_normalized,
      default_address: customerData.default_address || '',
      email: customerData.email || '',
    })
    .select('*')
    .single();

  if (insertError) {
    throw new Error(`Failed to create customer: ${insertError.message}`);
  }

  return newCustomer;
}

/**
 * Atomically obtain the next order number.
 * Uses database function `get_next_order_number()` with fallbacks.
 */
export async function getNextOrderNumber(supabase: SupabaseClient): Promise<string> {
  const { data, error } = await supabase.rpc('get_next_order_number');
  if (!error && data) {
    return data as string;
  }

  // Fallback: manual calculation from business settings
  const { data: settings } = await supabase
    .from('business_settings')
    .select('order_prefix, next_order_number, id')
    .single();

  const prefix = settings?.order_prefix || 'ORD';
  const nextNum = settings?.next_order_number || 1001;

  if (settings) {
    await supabase
      .from('business_settings')
      .update({ next_order_number: nextNum + 1 })
      .eq('id', settings.id);
  }

  return `${prefix}-${String(nextNum).padStart(5, '0')}`;
}

/**
 * Atomically obtain the next invoice number.
 * Uses database function `get_next_invoice_number()` with fallbacks.
 */
export async function getNextInvoiceNumber(supabase: SupabaseClient): Promise<string> {
  const { data, error } = await supabase.rpc('get_next_invoice_number');
  if (!error && data) {
    return data as string;
  }

  // Fallback
  const { data: settings } = await supabase
    .from('business_settings')
    .select('invoice_prefix, next_invoice_number, id')
    .single();

  const prefix = settings?.invoice_prefix || 'INV';
  const nextNum = settings?.next_invoice_number || 1001;

  if (settings) {
    await supabase
      .from('business_settings')
      .update({ next_invoice_number: nextNum + 1 })
      .eq('id', settings.id);
  }

  return `${prefix}-${String(nextNum).padStart(5, '0')}`;
}

/**
 * Record an audit log entry.
 */
export async function logAuditEvent(
  supabase: SupabaseClient,
  event: {
    entity_type: string;
    entity_id: string;
    action: string;
    changes?: Record<string, unknown>;
    performed_by?: string | null;
  }
) {
  try {
    await supabase.from('audit_logs').insert({
      entity_type: event.entity_type,
      entity_id: event.entity_id,
      action: event.action,
      changes: event.changes || {},
      performed_by: event.performed_by || null,
    });
  } catch (err) {
    console.error('Audit log failed:', err);
  }
}
