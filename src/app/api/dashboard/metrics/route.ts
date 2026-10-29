import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { today } from '@/lib/utils';
import type { DashboardMetrics } from '@/types';

export async function GET() {
  try {
    const supabase = await createClient();

    // 1. Fetch total orders & totals
    const { data: allOrders, error: ordersError } = await supabase
      .from('orders')
      .select('id, total_paise, amount_received_paise, balance_due_paise, payment_status, order_date');

    if (ordersError) {
      return NextResponse.json({ error: ordersError.message }, { status: 500 });
    }

    const todayStr = today();
    let total_orders = 0;
    let todays_orders = 0;
    let total_order_value_paise = 0;
    let total_payments_received_paise = 0;
    let outstanding_balance_paise = 0;
    let paid_orders = 0;
    let pending_orders = 0;

    (allOrders || []).forEach((order) => {
      total_orders += 1;
      total_order_value_paise += order.total_paise || 0;
      total_payments_received_paise += order.amount_received_paise || 0;
      outstanding_balance_paise += order.balance_due_paise || 0;

      if (order.order_date === todayStr) {
        todays_orders += 1;
      }

      if (order.payment_status === 'Paid') {
        paid_orders += 1;
      } else if (order.payment_status === 'Pending' || order.payment_status === 'Partially Paid') {
        pending_orders += 1;
      }
    });

    const metrics: DashboardMetrics = {
      total_orders,
      todays_orders,
      total_order_value_paise,
      total_payments_received_paise,
      pending_payments_paise: outstanding_balance_paise,
      outstanding_balance_paise,
      paid_orders,
      pending_orders,
    };

    return NextResponse.json(metrics);
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
