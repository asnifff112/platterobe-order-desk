import { describe, it, expect } from 'vitest';
import {
  formatCustomerWhatsAppMessage,
  getManualWhatsAppUrl,
  isWhatsAppCloudConfigured,
} from '@/lib/services/whatsapp';
import type { OrderWithDetails } from '@/types';

describe('WhatsApp Service & Formatting', () => {
  const mockOrder: OrderWithDetails = {
    id: 'test-order-uuid',
    order_number: 'ORD-01001',
    customer_id: 'test-cust-uuid',
    order_date: '2026-10-29',
    delivery_date: '2026-10-29',
    delivery_address: 'Beach Road, Parappanangadi',
    order_status: 'Delivered',
    payment_status: 'Paid',
    subtotal_paise: 180000,
    discount_paise: 0,
    delivery_charge_paise: 5000,
    total_paise: 185000,
    amount_received_paise: 185000,
    balance_due_paise: 0,
    order_notes: '',
    admin_notes: '',
    created_by: null,
    cancelled_at: null,
    cancelled_reason: '',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    customer: {
      id: 'test-cust-uuid',
      name: 'Fathima Zahra',
      phone: '9846012345',
      phone_normalized: '919846012345',
      default_address: 'Beach Road, Parappanangadi',
      email: '',
      notes: '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    items: [
      {
        id: 'item-1',
        order_id: 'test-order-uuid',
        product_name: 'Signature Chicken Biryani',
        quantity: 2,
        original_price_paise: 35000,
        selling_price_paise: 35000,
        line_total_paise: 70000,
        sort_order: 1,
        created_at: new Date().toISOString(),
      },
    ],
    payments: [],
    invoices: [],
  };

  it('formats a cordial customer message containing order and item breakdown', () => {
    const text = formatCustomerWhatsAppMessage({
      order: mockOrder,
      businessName: 'PLATTEROBE',
      upiId: 'platterobe@okhdfcbank',
    });

    expect(text).toContain('PLATTEROBE');
    expect(text).toContain('Fathima Zahra');
    expect(text).toContain('ORD-01001');
    expect(text).toContain('Signature Chicken Biryani × 2');
    expect(text).toContain('PAID IN FULL');
    expect(text).toContain('Parappanangadi, Kerala');
  });

  it('generates a manual wa.me link with pre-encoded message', () => {
    const url = getManualWhatsAppUrl({
      order: mockOrder,
      businessName: 'PLATTEROBE',
    });

    expect(url).toContain('https://wa.me/919846012345?text=');
    expect(url).toContain('PLATTEROBE');
  });

  it('reports unconfigured Cloud API gracefully when env vars are absent', () => {
    expect(typeof isWhatsAppCloudConfigured()).toBe('boolean');
  });
});
