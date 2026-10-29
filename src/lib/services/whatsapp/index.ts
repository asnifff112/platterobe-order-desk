import { formatCurrency } from '@/lib/utils/currency';
import { normalizePhone, whatsappChatUrl } from '@/lib/utils/phone';
import type { OrderWithDetails, Invoice } from '@/types';

export interface WhatsAppMessageOptions {
  order: OrderWithDetails;
  invoice?: Invoice | null;
  businessName?: string;
  pdfDownloadUrl?: string;
  upiId?: string;
}

/**
 * Format an engaging, professional WhatsApp message for PLATTEROBE customers
 */
export function formatCustomerWhatsAppMessage({
  order,
  invoice,
  businessName = 'PLATTEROBE',
  pdfDownloadUrl,
  upiId,
}: WhatsAppMessageOptions): string {
  const customerName = order.customer.name;
  const isPaid = order.payment_status === 'Paid';
  const isPartial = order.payment_status === 'Partially Paid';
  const totalStr = formatCurrency(order.total_paise);
  const paidStr = formatCurrency(order.amount_received_paise);
  const balanceStr = formatCurrency(order.balance_due_paise);

  let message = `*${businessName} — Order Confirmation*\n`;
  message += `━━━━━━━━━━━━━━━━━━━━━\n\n`;
  message += `Dear *${customerName}*,\n`;
  message += `Thank you for your order with ${businessName}!\n\n`;

  message += `📋 *Order Details*\n`;
  message += `• *Order Number:* ${order.order_number}\n`;
  if (invoice) {
    message += `• *Invoice:* ${invoice.invoice_number} (v${invoice.version})\n`;
  }
  message += `• *Date:* ${order.order_date}\n`;
  if (order.delivery_date) {
    message += `• *Delivery Date:* ${order.delivery_date}\n`;
  }
  if (order.delivery_address) {
    message += `• *Delivery Address:* ${order.delivery_address}\n`;
  }

  message += `\n🍲 *Items Ordered:*\n`;
  order.items.forEach((item, idx) => {
    message += `${idx + 1}. ${item.product_name} × ${item.quantity} (${formatCurrency(item.line_total_paise)})\n`;
  });

  message += `\n💰 *Payment Breakdown:*\n`;
  message += `• Total Amount: *${totalStr}*\n`;
  message += `• Paid: ${paidStr}\n`;

  if (isPaid) {
    message += `• Payment Status: ✅ *PAID IN FULL*\n`;
  } else if (isPartial) {
    message += `• Payment Status: ⏳ *Partially Paid*\n`;
    message += `• Balance Due: *${balanceStr}*\n`;
  } else {
    message += `• Payment Status: ⏳ *Pending (${balanceStr})*\n`;
  }

  if (!isPaid && upiId) {
    message += `\n💳 *UPI Payment ID:* \`${upiId}\`\n`;
  }

  if (pdfDownloadUrl) {
    message += `\n📄 *Download Invoice PDF:*\n${pdfDownloadUrl}\n`;
  }

  message += `\n━━━━━━━━━━━━━━━━━━━━━\n`;
  message += `Warm regards,\n*${businessName}*\nParappanangadi, Kerala, India\n`;

  return message;
}

/**
 * Generate manual WhatsApp Web/App click-to-chat URL
 */
export function getManualWhatsAppUrl(options: WhatsAppMessageOptions): string {
  const text = formatCustomerWhatsAppMessage(options);
  return whatsappChatUrl(options.order.customer.phone, text);
}

/**
 * Check if the official WhatsApp Cloud API is configured
 */
export function isWhatsAppCloudConfigured(): boolean {
  return Boolean(
    process.env.WHATSAPP_ACCESS_TOKEN &&
    process.env.WHATSAPP_PHONE_NUMBER_ID
  );
}

/**
 * Send official WhatsApp message using Meta WhatsApp Cloud API (if configured)
 */
export async function sendWhatsAppCloudMessage({
  toPhone,
  messageText,
  mediaUrl,
  fileName,
}: {
  toPhone: string;
  messageText: string;
  mediaUrl?: string;
  fileName?: string;
}) {
  if (!isWhatsAppCloudConfigured()) {
    return {
      success: false,
      configured: false,
      error: 'WhatsApp Cloud API is not configured. Use the manual WhatsApp sharing fallback.',
    };
  }

  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const version = process.env.WHATSAPP_API_VERSION || 'v21.0';
  const recipient = normalizePhone(toPhone);

  const url = `https://graph.facebook.com/${version}/${phoneNumberId}/messages`;

  const body: Record<string, unknown> = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: recipient,
  };

  if (mediaUrl) {
    body.type = 'document';
    body.document = {
      link: mediaUrl,
      filename: fileName || 'Invoice.pdf',
      caption: messageText,
    };
  } else {
    body.type = 'text';
    body.text = { body: messageText };
  }

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await res.json();

    if (!res.ok) {
      return {
        success: false,
        configured: true,
        error: data?.error?.message || 'Failed to send WhatsApp message via Meta Cloud API',
      };
    }

    const messageId = data?.messages?.[0]?.id || '';
    return {
      success: true,
      configured: true,
      messageId,
    };
  } catch (err: any) {
    return {
      success: false,
      configured: true,
      error: err.message || 'Network error sending WhatsApp message',
    };
  }
}
