import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  isWhatsAppCloudConfigured,
  sendWhatsAppCloudMessage,
  formatCustomerWhatsAppMessage,
  getManualWhatsAppUrl,
} from '@/lib/services/whatsapp';
import type { OrderWithDetails } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await request.json();
    const { order_id, invoice_id, custom_message } = body;

    if (!order_id) {
      return NextResponse.json({ error: 'Order ID is required' }, { status: 400 });
    }

    // 1. Fetch order details
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*, customer:customers(*)')
      .eq('id', order_id)
      .single();

    if (orderError || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const { data: items } = await supabase
      .from('order_items')
      .select('*')
      .eq('order_id', order_id);

    const { data: payments } = await supabase
      .from('payments')
      .select('*')
      .eq('order_id', order_id)
      .eq('is_void', false);

    let invoice = null;
    if (invoice_id) {
      const { data: inv } = await supabase
        .from('invoices')
        .select('*')
        .eq('id', invoice_id)
        .single();
      invoice = inv;
    } else {
      const { data: inv } = await supabase
        .from('invoices')
        .select('*')
        .eq('order_id', order_id)
        .order('version', { ascending: false })
        .limit(1)
        .maybeSingle();
      invoice = inv;
    }

    const { data: settings } = await supabase
      .from('business_settings')
      .select('*')
      .maybeSingle();

    const orderWithDetails: OrderWithDetails = {
      ...order,
      items: items || [],
      payments: payments || [],
      invoices: invoice ? [invoice] : [],
    };

    const appUrl = process.env.APP_URL || 'http://localhost:3000';
    const pdfDownloadUrl = invoice ? `${appUrl}/api/invoices/${invoice.id}/pdf` : undefined;

    // Default formatted message or custom message
    const formattedMessage =
      custom_message ||
      formatCustomerWhatsAppMessage({
        order: orderWithDetails,
        invoice,
        businessName: settings?.business_name || 'PLATTEROBE',
        pdfDownloadUrl,
      });

    const manualUrl = getManualWhatsAppUrl({
      order: orderWithDetails,
      invoice,
      businessName: settings?.business_name || 'PLATTEROBE',
      pdfDownloadUrl,
    });

    const isCloudConfigured = isWhatsAppCloudConfigured();

    // If Cloud API configured, attempt automatic send
    if (isCloudConfigured) {
      const cloudResult = await sendWhatsAppCloudMessage({
        toPhone: order.customer.phone,
        messageText: formattedMessage,
        mediaUrl: pdfDownloadUrl,
        fileName: invoice ? `${invoice.invoice_number}_v${invoice.version}.pdf` : undefined,
      });

      // Record in whatsapp_messages table
      await supabase.from('whatsapp_messages').insert({
        order_id: order.id,
        invoice_id: invoice?.id || null,
        customer_phone: order.customer.phone,
        message_type: pdfDownloadUrl ? 'document' : 'text',
        whatsapp_message_id: cloudResult.messageId || '',
        status: cloudResult.success ? 'sent' : 'failed',
        error_message: cloudResult.error || '',
        sent_at: cloudResult.success ? new Date().toISOString() : null,
      });

      return NextResponse.json({
        success: cloudResult.success,
        cloudApi: true,
        messageId: cloudResult.messageId,
        error: cloudResult.error,
        manualShareUrl: manualUrl,
        messageText: formattedMessage,
      });
    }

    // Otherwise, return manual sharing URL
    return NextResponse.json({
      success: true,
      cloudApi: false,
      manualShareUrl: manualUrl,
      messageText: formattedMessage,
      info: 'WhatsApp Cloud API credentials not configured. Use the direct manual share link.',
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to prepare WhatsApp message' },
      { status: 500 }
    );
  }
}
