import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { normalizePhone } from '@/lib/utils/phone';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);

    const search = searchParams.get('search')?.trim() || '';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '25', 10)));

    let query = supabase.from('customers').select('*', { count: 'exact' });

    if (search) {
      const normalized = normalizePhone(search);
      query = query.or(
        `name.ilike.%${search}%,phone.ilike.%${search}%,phone_normalized.ilike.%${normalized}%`
      );
    }

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    query = query
      .order('created_at', { ascending: false })
      .range(from, to);

    const { data: customers, count, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Enhance customers with aggregate statistics
    const customerIds = (customers || []).map((c) => c.id);

    const statsMap: Record<
      string,
      { total_orders: number; total_spent_paise: number; outstanding_balance_paise: number; last_order_date: string | null }
    > = {};

    if (customerIds.length > 0) {
      const { data: orders } = await supabase
        .from('orders')
        .select('customer_id, total_paise, balance_due_paise, order_date')
        .in('customer_id', customerIds);

      (orders || []).forEach((o) => {
        if (!statsMap[o.customer_id]) {
          statsMap[o.customer_id] = {
            total_orders: 0,
            total_spent_paise: 0,
            outstanding_balance_paise: 0,
            last_order_date: null,
          };
        }
        statsMap[o.customer_id].total_orders += 1;
        statsMap[o.customer_id].total_spent_paise += o.total_paise;
        statsMap[o.customer_id].outstanding_balance_paise += o.balance_due_paise;
        if (
          !statsMap[o.customer_id].last_order_date ||
          o.order_date > statsMap[o.customer_id].last_order_date!
        ) {
          statsMap[o.customer_id].last_order_date = o.order_date;
        }
      });
    }

    const customersWithStats = (customers || []).map((c) => ({
      ...c,
      total_orders: statsMap[c.id]?.total_orders || 0,
      total_spent_paise: statsMap[c.id]?.total_spent_paise || 0,
      outstanding_balance_paise: statsMap[c.id]?.outstanding_balance_paise || 0,
      last_order_date: statsMap[c.id]?.last_order_date || null,
    }));

    return NextResponse.json({
      customers: customersWithStats,
      total: count || 0,
      page,
      limit,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to fetch customers' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await request.json();

    const { name, phone, default_address, email, notes } = body;

    if (!name || !phone) {
      return NextResponse.json(
        { error: 'Name and phone are required' },
        { status: 400 }
      );
    }

    const phone_normalized = normalizePhone(phone);

    const { data: customer, error } = await supabase
      .from('customers')
      .insert({
        name: name.trim(),
        phone: phone.trim(),
        phone_normalized,
        default_address: default_address || '',
        email: email || '',
        notes: notes || '',
      })
      .select('*')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ customer }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to create customer' },
      { status: 500 }
    );
  }
}
