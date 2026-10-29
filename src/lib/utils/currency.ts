// =============================================================================
// Currency utilities — all monetary values stored as INTEGER paise
// =============================================================================

/**
 * Convert rupees (number) to paise (integer).
 * Handles floating point by rounding to nearest paise.
 */
export function rupeesToPaise(rupees: number): number {
  return Math.round(rupees * 100);
}

/**
 * Convert paise (integer) to rupees (number).
 */
export function paiseToRupees(paise: number): number {
  return paise / 100;
}

/**
 * Format paise as INR currency string.
 * Example: 150050 → "₹1,500.50"
 */
export function formatCurrency(paise: number): string {
  const rupees = paise / 100;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(rupees);
}

/**
 * Format rupees as INR currency string.
 */
export function formatRupees(rupees: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(rupees);
}

/**
 * Convert amount in paise to words in Indian Rupees.
 * Example: 150050 → "One Thousand Five Hundred Rupees and Fifty Paise Only"
 */
export function amountInWords(paise: number): string {
  const rupees = Math.floor(paise / 100);
  const remainingPaise = paise % 100;

  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen',
    'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  function numberToWords(num: number): string {
    if (num === 0) return '';
    if (num < 20) return ones[num];
    if (num < 100) return tens[Math.floor(num / 10)] + (num % 10 ? ' ' + ones[num % 10] : '');
    if (num < 1000) return ones[Math.floor(num / 100)] + ' Hundred' + (num % 100 ? ' and ' + numberToWords(num % 100) : '');

    // Indian numbering system
    if (num < 100000) {
      const thousands = Math.floor(num / 1000);
      const remainder = num % 1000;
      return numberToWords(thousands) + ' Thousand' + (remainder ? ' ' + numberToWords(remainder) : '');
    }
    if (num < 10000000) {
      const lakhs = Math.floor(num / 100000);
      const remainder = num % 100000;
      return numberToWords(lakhs) + ' Lakh' + (remainder ? ' ' + numberToWords(remainder) : '');
    }
    const crores = Math.floor(num / 10000000);
    const remainder = num % 10000000;
    return numberToWords(crores) + ' Crore' + (remainder ? ' ' + numberToWords(remainder) : '');
  }

  let result = '';

  if (rupees === 0 && remainingPaise === 0) {
    return 'Zero Rupees Only';
  }

  if (rupees > 0) {
    result += numberToWords(rupees) + ' Rupees';
  }

  if (remainingPaise > 0) {
    if (rupees > 0) result += ' and ';
    result += numberToWords(remainingPaise) + ' Paise';
  }

  result += ' Only';
  return result;
}
