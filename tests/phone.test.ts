import { describe, it, expect } from 'vitest';
import {
  normalizePhone,
  formatPhone,
  whatsappChatUrl,
  isValidPhone,
} from '@/lib/utils/phone';

describe('Phone Number Normalization & WhatsApp Utilities', () => {
  it('normalizes 10-digit Indian numbers to international 91 format', () => {
    expect(normalizePhone('9846012345')).toBe('919846012345');
    expect(normalizePhone('+91 98460 12345')).toBe('919846012345');
    expect(normalizePhone('09846012345')).toBe('919846012345');
    expect(normalizePhone('919846012345')).toBe('919846012345');
  });

  it('formats phone numbers for display', () => {
    expect(formatPhone('9846012345')).toBe('+91 98460 12345');
    expect(formatPhone('919846012345')).toBe('+91 98460 12345');
  });

  it('generates valid WhatsApp click-to-chat URLs', () => {
    const url = whatsappChatUrl('9846012345', 'Hello PLATTEROBE');
    expect(url).toBe('https://wa.me/919846012345?text=Hello%20PLATTEROBE');
  });

  it('validates phone numbers', () => {
    expect(isValidPhone('9846012345')).toBe(true);
    expect(isValidPhone('+91 98460 12345')).toBe(true);
    expect(isValidPhone('123')).toBe(false);
  });
});
