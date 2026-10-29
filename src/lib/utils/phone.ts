/**
 * Normalize a phone number for storage and matching.
 * Strips spaces, dashes, and ensures Indian country code.
 */
export function normalizePhone(phone: string): string {
  // Remove all non-digit characters except leading +
  let cleaned = phone.replace(/[^\d+]/g, '');

  // Remove leading + if present
  if (cleaned.startsWith('+')) {
    cleaned = cleaned.substring(1);
  }

  // If starts with 91 and has 12 digits, it's already international
  if (cleaned.startsWith('91') && cleaned.length === 12) {
    return cleaned;
  }

  // If 10 digits, assume Indian number
  if (cleaned.length === 10) {
    return '91' + cleaned;
  }

  // If starts with 0 (trunk prefix), remove it and add country code
  if (cleaned.startsWith('0') && cleaned.length === 11) {
    return '91' + cleaned.substring(1);
  }

  return cleaned;
}

/**
 * Format phone for display: +91 XXXXX XXXXX
 */
export function formatPhone(phone: string): string {
  const normalized = normalizePhone(phone);
  if (normalized.length === 12 && normalized.startsWith('91')) {
    const local = normalized.substring(2);
    return `+91 ${local.substring(0, 5)} ${local.substring(5)}`;
  }
  return phone;
}

/**
 * Generate WhatsApp click-to-chat URL
 */
export function whatsappChatUrl(phone: string, message?: string): string {
  const normalized = normalizePhone(phone);
  let url = `https://wa.me/${normalized}`;
  if (message) {
    url += `?text=${encodeURIComponent(message)}`;
  }
  return url;
}

/**
 * Basic validation: phone should be at least 10 digits
 */
export function isValidPhone(phone: string): boolean {
  const digits = phone.replace(/\D/g, '');
  return digits.length >= 10 && digits.length <= 13;
}
