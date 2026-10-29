import { describe, it, expect } from 'vitest';
import { generateInvoicePDFBuffer } from '@/lib/services/pdf/invoice-generator';
import type { OrderWithDetails } from '@/types';

describe('PDF Invoice Generator', () => {
  it('generates a valid binary PDF buffer with PDF header', async () => {
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
      order_notes: 'Extra sauce',
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
        email: 'fathima@example.com',
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

    const pdfBuffer = await generateInvoicePDFBuffer({
      order: mockOrder,
      invoiceNumber: 'INV-01001',
      version: 1,
    });

    expect(pdfBuffer).toBeDefined();
    expect(pdfBuffer.length).toBeGreaterThan(500);

    // Verify PDF header magic bytes "%PDF-"
    const header = pdfBuffer.subarray(0, 5).toString('ascii');
    expect(header).toBe('%PDF-');
  });
});
