import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();

    // Query all orders with an outstanding balance
    const { data: pendingOrders, error } = await supabase
      .from('orders')
      .select('*, customer:customers(*)')
      .gt('balance_due_paise', 0)
      .neq('order_status', 'Cancelled')
      .order('balance_due_paise', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const totalOutstandingPaise = (pendingOrders || []).reduce(
      (sum, o) => sum + o.balance_due_paise,
      0
    );

    return NextResponse.json({
      orders: pendingOrders || [],
      total_outstanding_paise: totalOutstandingPaise,
      count: pendingOrders?.length || 0,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to fetch pending report' },
      { status: 500 }
    );
  }
}
