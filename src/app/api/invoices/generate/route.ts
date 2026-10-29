import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getNextInvoiceNumber, logAuditEvent } from '@/lib/services/order';
import { generateInvoicePDFBuffer } from '@/lib/services/pdf/invoice-generator';
import type { InvoiceType, OrderWithDetails } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await request.json();
    const { order_id } = body;

    if (!order_id) {
      return NextResponse.json({ error: 'Order ID is required' }, { status: 400 });
    }

    // 1. Fetch full order details
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
      .eq('order_id', order_id)
      .order('sort_order', { ascending: true });

    const { data: payments } = await supabase
      .from('payments')
      .select('*')
      .eq('order_id', order_id)
      .eq('is_void', false)
      .order('payment_date', { ascending: false });

    const { data: existingInvoices } = await supabase
      .from('invoices')
      .select('*')
      .eq('order_id', order_id)
      .order('version', { ascending: false });

    // 2. Fetch business settings
    const { data: settings } = await supabase
      .from('business_settings')
      .select('*')
      .maybeSingle();

    // 3. Determine invoice number & version
    let invoice_number: string;
    let version = 1;

    if (existingInvoices && existingInvoices.length > 0) {
      invoice_number = existingInvoices[0].invoice_number;
      version = existingInvoices[0].version + 1;
    } else {
      invoice_number = await getNextInvoiceNumber(supabase);
      version = 1;
    }

    // 4. Determine invoice type and latest payment snapshot
    let invoice_type: InvoiceType = 'standard';
    if (order.payment_status === 'Paid') {
      invoice_type = 'paid';
    } else if (order.payment_status === 'Partially Paid') {
      invoice_type = 'partial';
    }

    const latestPayment = payments && payments.length > 0 ? payments[0] : null;

    const paymentSnapshot = {
      payment_status: order.payment_status,
      amount_received_paise: order.amount_received_paise,
      balance_due_paise: order.balance_due_paise,
      payment_date: latestPayment?.payment_date || null,
      payment_method: latestPayment?.payment_method || '',
    };

    // 5. Build full order details object for PDF rendering
    const orderWithDetails: OrderWithDetails = {
      ...order,
      items: items || [],
      payments: payments || [],
      invoices: existingInvoices || [],
    };

    // Generate PDF Buffer to verify validity
    const pdfBuffer = await generateInvoicePDFBuffer({
      order: orderWithDetails,
      settings,
      invoiceNumber: invoice_number,
      version,
      paymentSnapshot,
    });

    // 6. Attempt private storage upload if bucket exists
    let filePath = '';
    const fileUrl = '';
    const storageFileName = `${invoice_number}_v${version}.pdf`;

    try {
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('invoices')
        .upload(storageFileName, pdfBuffer, {
          contentType: 'application/pdf',
          upsert: true,
        });

      if (!uploadError && uploadData) {
        filePath = uploadData.path;
      }
    } catch {
      // Storage bucket might not exist yet, fallback gracefully
      filePath = '';
    }

    // 7. Insert invoice record
    const { data: newInvoice, error: invoiceError } = await supabase
      .from('invoices')
      .insert({
        order_id,
        invoice_number,
        version,
        invoice_type,
        file_path: filePath,
        file_url: fileUrl,
        total_paise: order.total_paise,
        amount_received_paise: order.amount_received_paise,
        balance_due_paise: order.balance_due_paise,
        payment_status: order.payment_status,
        payment_date: paymentSnapshot.payment_date,
        payment_method: paymentSnapshot.payment_method,
      })
      .select('*')
      .single();

    if (invoiceError) {
      return NextResponse.json({ error: invoiceError.message }, { status: 500 });
    }

    // 8. Audit log
    await logAuditEvent(supabase, {
      entity_type: 'invoice',
      entity_id: newInvoice.id,
      action: 'generated',
      changes: {
        invoice_number,
        version,
        invoice_type,
        total_paise: order.total_paise,
        payment_status: order.payment_status,
      },
    });

    return NextResponse.json({
      invoice: newInvoice,
      pdfUrl: `/api/invoices/${newInvoice.id}/pdf`,
    }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to generate invoice' },
      { status: 500 }
    );
  }
}
