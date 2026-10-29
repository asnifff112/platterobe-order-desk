import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { paiseToRupees } from '@/lib/utils/currency';

function escapeCsvField(field: unknown): string {
  if (field === null || field === undefined) return '""';
  const str = String(field);
  return `"${str.replace(/"/g, '""')}"`;
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);

    const type = searchParams.get('type') || 'orders'; // 'orders' | 'payments' | 'expenses'
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    if (type === 'orders') {
      let query = supabase
        .from('orders')
        .select('*, customer:customers(name, phone)');

      if (startDate) query = query.gte('order_date', startDate);
      if (endDate) query = query.lte('order_date', endDate);

      query = query.order('order_date', { ascending: false });
      const { data: orders, error } = await query;

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      const headers = [
        'Order Number',
        'Order Date',
        'Customer Name',
        'Customer Phone',
        'Delivery Address',
        'Order Status',
        'Payment Status',
        'Subtotal (INR)',
        'Discount (INR)',
        'Delivery Charge (INR)',
        'Total (INR)',
        'Amount Paid (INR)',
        'Balance Due (INR)',
        'Order Notes',
      ];

      const rows = (orders || []).map((o) => [
        escapeCsvField(o.order_number),
        escapeCsvField(o.order_date),
        escapeCsvField(o.customer?.name || ''),
        escapeCsvField(o.customer?.phone || ''),
        escapeCsvField(o.delivery_address || ''),
        escapeCsvField(o.order_status),
        escapeCsvField(o.payment_status),
        escapeCsvField(paiseToRupees(o.subtotal_paise).toFixed(2)),
        escapeCsvField(paiseToRupees(o.discount_paise).toFixed(2)),
        escapeCsvField(paiseToRupees(o.delivery_charge_paise).toFixed(2)),
        escapeCsvField(paiseToRupees(o.total_paise).toFixed(2)),
        escapeCsvField(paiseToRupees(o.amount_received_paise).toFixed(2)),
        escapeCsvField(paiseToRupees(o.balance_due_paise).toFixed(2)),
        escapeCsvField(o.order_notes || ''),
      ]);

      const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');

      return new NextResponse(csvContent, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="platterobe-orders-${Date.now()}.csv"`,
        },
      });
    }

    if (type === 'payments') {
      let query = supabase
        .from('payments')
        .select('*, order:orders(order_number, customer:customers(name, phone))');

      if (startDate) query = query.gte('payment_date', startDate);
      if (endDate) query = query.lte('payment_date', endDate);

      query = query.order('payment_date', { ascending: false });
      const { data: payments, error } = await query;

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      const headers = [
        'Payment Date',
        'Order Number',
        'Customer Name',
        'Customer Phone',
        'Amount (INR)',
        'Payment Method',
        'Transaction Reference',
        'Status',
        'Notes',
      ];

      const rows = (payments || []).map((p) => [
        escapeCsvField(p.payment_date),
        escapeCsvField(p.order?.order_number || ''),
        escapeCsvField(p.order?.customer?.name || ''),
        escapeCsvField(p.order?.customer?.phone || ''),
        escapeCsvField(paiseToRupees(p.amount_paise).toFixed(2)),
        escapeCsvField(p.payment_method),
        escapeCsvField(p.transaction_reference || ''),
        escapeCsvField(p.is_void ? 'Voided' : 'Valid'),
        escapeCsvField(p.notes || ''),
      ]);

      const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');

      return new NextResponse(csvContent, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="platterobe-payments-${Date.now()}.csv"`,
        },
      });
    }

    if (type === 'expenses') {
      let query = supabase.from('expenses').select('*');

      if (startDate) query = query.gte('expense_date', startDate);
      if (endDate) query = query.lte('expense_date', endDate);

      query = query.order('expense_date', { ascending: false });
      const { data: expenses, error } = await query;

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      const headers = [
        'Date',
        'Title',
        'Category',
        'Amount (INR)',
        'Payment Method',
        'Vendor',
        'Description',
      ];

      const rows = (expenses || []).map((e) => [
        escapeCsvField(e.expense_date),
        escapeCsvField(e.title),
        escapeCsvField(e.category),
        escapeCsvField(paiseToRupees(e.amount_paise).toFixed(2)),
        escapeCsvField(e.payment_method),
        escapeCsvField(e.vendor || ''),
        escapeCsvField(e.description || ''),
      ]);

      const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');

      return new NextResponse(csvContent, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="platterobe-expenses-${Date.now()}.csv"`,
        },
      });
    }

    return NextResponse.json({ error: 'Invalid export type' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to export CSV' },
      { status: 500 }
    );
  }
}
