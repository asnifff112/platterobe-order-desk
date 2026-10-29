import { describe, it, expect } from 'vitest';
import { calculateOrderTotals, computePaymentStatus } from '@/lib/services/order';

describe('Order Calculation & Payment Status Logic', () => {
  it('calculates multiple line items, subtotal, discount, and grand total in paise', () => {
    const input = {
      items: [
        {
          product_name: 'Chicken Dum Biryani',
          quantity: 2,
          original_price: 350,
          selling_price: 320,
        },
        {
          product_name: 'Mutton Roast',
          quantity: 1,
          original_price: 450,
          selling_price: 400,
        },
      ],
      discount: 40,
      delivery_charge: 50,
    };

    const result = calculateOrderTotals(input);

    // 2 * 320 = 640 INR -> 64000 paise
    expect(result.items[0].line_total_paise).toBe(64000);
    // 1 * 400 = 400 INR -> 40000 paise
    expect(result.items[1].line_total_paise).toBe(40000);

    // Subtotal: 640 + 400 = 1040 INR -> 104000 paise
    expect(result.subtotal_paise).toBe(104000);
    expect(result.discount_paise).toBe(4000);
    expect(result.delivery_charge_paise).toBe(5000);

    // Total: 1040 - 40 + 50 = 1050 INR -> 105000 paise
    expect(result.total_paise).toBe(105000);
  });

  it('determines payment status for unpaid, partial, full, and refunded orders', () => {
    const totalPaise = 100000; // 1000 INR

    // 0 paid -> Pending
    expect(computePaymentStatus(totalPaise, 0)).toBe('Pending');

    // 500 paid -> Partially Paid
    expect(computePaymentStatus(totalPaise, 50000)).toBe('Partially Paid');

    // 1000 paid -> Paid
    expect(computePaymentStatus(totalPaise, 100000)).toBe('Paid');

    // Overpaid -> Paid
    expect(computePaymentStatus(totalPaise, 120000)).toBe('Paid');

    // Refunded with 0 net -> Refunded
    expect(computePaymentStatus(totalPaise, 0, 100000)).toBe('Refunded');

    // Partially refunded -> Partially Refunded
    expect(computePaymentStatus(totalPaise, 50000, 50000)).toBe('Partially Refunded');
  });
});
