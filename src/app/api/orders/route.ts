import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createOrderSchema } from '@/lib/validations';
import {
  calculateOrderTotals,
  getOrCreateCustomer,
  getNextOrderNumber,
  logAuditEvent,
} from '@/lib/services/order';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);

    const search = searchParams.get('search')?.trim() || '';
    const status = searchParams.get('status') || '';
    const paymentStatus = searchParams.get('payment_status') || '';
    const startDate = searchParams.get('startDate') || '';
    const endDate = searchParams.get('endDate') || '';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));
    const sort = searchParams.get('sort') || 'created_at';
    const orderDirection = searchParams.get('order') === 'asc' ? true : false;

    let query = supabase
      .from('orders')
      .select('*, customer:customers(*)', { count: 'exact' });

    // Status filters
    if (status) {
      query = query.eq('order_status', status);
    }
    if (paymentStatus) {
      query = query.eq('payment_status', paymentStatus);
    }
    if (startDate) {
      query = query.gte('order_date', startDate);
    }
    if (endDate) {
      query = query.lte('order_date', endDate);
    }

    // Search filter (order_number or customer name)
    if (search) {
      query = query.or(
        `order_number.ilike.%${search}%,customer.name.ilike.%${search}%,customer.phone.ilike.%${search}%`
      );
    }

    // Pagination & sorting
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    query = query
      .order(sort, { ascending: orderDirection })
      .range(from, to);

    const { data: orders, count, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      orders: orders || [],
      total: count || 0,
      page,
      limit,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to fetch orders' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await request.json();

    // Validate body
    const validated = createOrderSchema.safeParse(body);
    if (!validated.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validated.error.flatten() },
        { status: 400 }
      );
    }

    const input = validated.data;

    // 1. Calculate items and totals in paise
    const calculated = calculateOrderTotals({
      items: input.items,
      discount: input.discount,
      delivery_charge: input.delivery_charge,
    });

    // 2. Get or create customer
    const customer = await getOrCreateCustomer(supabase, {
      name: input.customer_name,
      phone: input.customer_phone,
      default_address: input.delivery_address,
    });

    // 3. Obtain next order number
    const order_number = await getNextOrderNumber(supabase);

    // 4. Insert order
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        order_number,
        customer_id: customer.id,
        order_date: input.order_date,
        delivery_date: input.delivery_date || null,
        delivery_address: input.delivery_address || customer.default_address || '',
        order_status: 'New',
        payment_status: 'Pending',
        subtotal_paise: calculated.subtotal_paise,
        discount_paise: calculated.discount_paise,
        delivery_charge_paise: calculated.delivery_charge_paise,
        total_paise: calculated.total_paise,
        amount_received_paise: 0,
        balance_due_paise: calculated.total_paise,
        order_notes: input.order_notes || '',
        admin_notes: input.admin_notes || '',
      })
      .select('*, customer:customers(*)')
      .single();

    if (orderError) {
      return NextResponse.json({ error: orderError.message }, { status: 500 });
    }

    // 5. Insert order items
    const itemsToInsert = calculated.items.map((item) => ({
      order_id: order.id,
      product_name: item.product_name,
      quantity: item.quantity,
      original_price_paise: item.original_price_paise,
      selling_price_paise: item.selling_price_paise,
      line_total_paise: item.line_total_paise,
      sort_order: item.sort_order,
    }));

    const { error: itemsError } = await supabase
      .from('order_items')
      .insert(itemsToInsert);

    if (itemsError) {
      // rollback or report
      console.error('Failed to insert items:', itemsError);
    }

    // 6. Audit log
    await logAuditEvent(supabase, {
      entity_type: 'order',
      entity_id: order.id,
      action: 'created',
      changes: {
        order_number,
        total_paise: calculated.total_paise,
        items_count: itemsToInsert.length,
      },
    });

    return NextResponse.json({ order }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to create order' },
      { status: 500 }
    );
  }
}
