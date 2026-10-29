import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);

    const orderId = searchParams.get('order_id');
    const search = searchParams.get('search')?.trim();
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '25', 10)));

    let query = supabase
      .from('invoices')
      .select('*, order:orders(id, order_number, order_date, customer:customers(id, name, phone))', {
        count: 'exact',
      });

    if (orderId) {
      query = query.eq('order_id', orderId);
    }

    if (search) {
      query = query.ilike('invoice_number', `%${search}%`);
    }

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    query = query
      .order('created_at', { ascending: false })
      .range(from, to);

    const { data: invoices, count, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      invoices: invoices || [],
      total: count || 0,
      page,
      limit,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to fetch invoices' },
      { status: 500 }
    );
  }
}
