import { describe, it, expect } from 'vitest';
import {
  rupeesToPaise,
  paiseToRupees,
  formatCurrency,
  formatRupees,
  amountInWords,
} from '@/lib/utils/currency';

describe('Currency Utilities (INR & Paise)', () => {
  it('converts rupees to paise accurately', () => {
    expect(rupeesToPaise(100)).toBe(10000);
    expect(rupeesToPaise(150.5)).toBe(15050);
    expect(rupeesToPaise(0)).toBe(0);
    expect(rupeesToPaise(0.99)).toBe(99);
  });

  it('converts paise to rupees accurately', () => {
    expect(paiseToRupees(10000)).toBe(100);
    expect(paiseToRupees(15050)).toBe(150.5);
    expect(paiseToRupees(0)).toBe(0);
  });

  it('formats INR currency string properly', () => {
    const formatted = formatCurrency(185000);
    expect(formatted).toContain('1,850.00');
  });

  it('converts amount in paise to Indian English words', () => {
    expect(amountInWords(0)).toBe('Zero Rupees Only');
    expect(amountInWords(10000)).toBe('One Hundred Rupees Only');
    expect(amountInWords(180000)).toBe('One Thousand Eight Hundred Rupees Only');
    expect(amountInWords(185050)).toBe('One Thousand Eight Hundred and Fifty Rupees and Fifty Paise Only');
    expect(amountInWords(10000000)).toBe('One Lakh Rupees Only');
  });
});
