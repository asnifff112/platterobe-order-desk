import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);

    const period = searchParams.get('period') || 'monthly'; // 'daily' | 'monthly'
    const year = parseInt(searchParams.get('year') || String(new Date().getFullYear()), 10);

    // Fetch all non-cancelled orders for the year
    const startOfYear = `${year}-01-01`;
    const endOfYear = `${year}-12-31`;

    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('order_date, total_paise, amount_received_paise, balance_due_paise, order_status, payment_status')
      .gte('order_date', startOfYear)
      .lte('order_date', endOfYear)
      .neq('order_status', 'Cancelled');

    if (ordersError) {
      return NextResponse.json({ error: ordersError.message }, { status: 500 });
    }

    // Fetch expenses for the year to compute net profit
    const { data: expenses } = await supabase
      .from('expenses')
      .select('expense_date, amount_paise, category')
      .gte('expense_date', startOfYear)
      .lte('expense_date', endOfYear);

    const grouped: Record<
      string,
      {
        key: string;
        label: string;
        order_count: number;
        total_sales_paise: number;
        payments_received_paise: number;
        expenses_paise: number;
        net_paise: number;
      }
    > = {};

    // Initialize months if monthly
    if (period === 'monthly') {
      const monthNames = [
        'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
        'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
      ];
      for (let m = 1; m <= 12; m++) {
        const key = `${year}-${String(m).padStart(2, '0')}`;
        grouped[key] = {
          key,
          label: `${monthNames[m - 1]} ${year}`,
          order_count: 0,
          total_sales_paise: 0,
          payments_received_paise: 0,
          expenses_paise: 0,
          net_paise: 0,
        };
      }
    }

    // Populate orders
    (orders || []).forEach((order) => {
      const dateKey =
        period === 'monthly'
          ? order.order_date.substring(0, 7) // YYYY-MM
          : order.order_date; // YYYY-MM-DD

      if (!grouped[dateKey]) {
        grouped[dateKey] = {
          key: dateKey,
          label: dateKey,
          order_count: 0,
          total_sales_paise: 0,
          payments_received_paise: 0,
          expenses_paise: 0,
          net_paise: 0,
        };
      }

      grouped[dateKey].order_count += 1;
      grouped[dateKey].total_sales_paise += order.total_paise;
      grouped[dateKey].payments_received_paise += order.amount_received_paise;
    });

    // Populate expenses
    (expenses || []).forEach((exp) => {
      const dateKey =
        period === 'monthly'
          ? exp.expense_date.substring(0, 7)
          : exp.expense_date;

      if (grouped[dateKey]) {
        grouped[dateKey].expenses_paise += exp.amount_paise;
      }
    });

    // Compute net
    Object.values(grouped).forEach((item) => {
      item.net_paise = item.total_sales_paise - item.expenses_paise;
    });

    const results = Object.values(grouped).sort((a, b) => a.key.localeCompare(b.key));

    // Summary totals
    const total_sales_paise = results.reduce((acc, r) => acc + r.total_sales_paise, 0);
    const total_received_paise = results.reduce((acc, r) => acc + r.payments_received_paise, 0);
    const total_expenses_paise = results.reduce((acc, r) => acc + r.expenses_paise, 0);
    const total_orders = results.reduce((acc, r) => acc + r.order_count, 0);

    return NextResponse.json({
      period,
      year,
      summary: {
        total_sales_paise,
        total_received_paise,
        total_expenses_paise,
        net_profit_paise: total_sales_paise - total_expenses_paise,
        total_orders,
        average_order_value_paise: total_orders > 0 ? Math.round(total_sales_paise / total_orders) : 0,
      },
      data: results,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to generate sales report' },
      { status: 500 }
    );
  }
}
