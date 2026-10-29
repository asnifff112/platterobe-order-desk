import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateInvoicePDFBuffer } from '@/lib/services/pdf/invoice-generator';
import type { OrderWithDetails } from '@/types';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // 1. Fetch invoice record
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select('*')
      .eq('id', id)
      .single();

    if (invoiceError || !invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    // 2. If storage has the file, try reading it
    if (invoice.file_path) {
      try {
        const { data: fileData, error: downloadError } = await supabase.storage
          .from('invoices')
          .download(invoice.file_path);

        if (!downloadError && fileData) {
          const arrayBuffer = await fileData.arrayBuffer();
          return new NextResponse(arrayBuffer, {
            status: 200,
            headers: {
              'Content-Type': 'application/pdf',
              'Content-Disposition': `inline; filename="${invoice.invoice_number}_v${invoice.version}.pdf"`,
            },
          });
        }
      } catch {
        // Fallback to on-demand generation
      }
    }

    // 3. Fallback: On-demand generation using stored invoice snapshot
    const { data: order } = await supabase
      .from('orders')
      .select('*, customer:customers(*)')
      .eq('id', invoice.order_id)
      .single();

    if (!order) {
      return NextResponse.json({ error: 'Order for this invoice not found' }, { status: 404 });
    }

    const { data: items } = await supabase
      .from('order_items')
      .select('*')
      .eq('order_id', invoice.order_id)
      .order('sort_order', { ascending: true });

    const { data: payments } = await supabase
      .from('payments')
      .select('*')
      .eq('order_id', invoice.order_id)
      .eq('is_void', false);

    const { data: settings } = await supabase
      .from('business_settings')
      .select('*')
      .maybeSingle();

    const orderWithDetails: OrderWithDetails = {
      ...order,
      items: items || [],
      payments: payments || [],
      invoices: [invoice],
    };

    const pdfBuffer = await generateInvoicePDFBuffer({
      order: orderWithDetails,
      settings,
      invoiceNumber: invoice.invoice_number,
      version: invoice.version,
      paymentSnapshot: {
        payment_status: invoice.payment_status,
        amount_received_paise: invoice.amount_received_paise,
        balance_due_paise: invoice.balance_due_paise,
        payment_date: invoice.payment_date,
        payment_method: invoice.payment_method,
      },
    });

    const uint8 = new Uint8Array(pdfBuffer);

    return new NextResponse(uint8, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${invoice.invoice_number}_v${invoice.version}.pdf"`,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to serve invoice PDF' },
      { status: 500 }
    );
  }
}
