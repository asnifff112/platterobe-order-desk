import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { recordPaymentSchema } from '@/lib/validations';
import { rupeesToPaise } from '@/lib/utils/currency';
import { computePaymentStatus, logAuditEvent } from '@/lib/services/order';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);

    const orderId = searchParams.get('order_id');
    const method = searchParams.get('method');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '25', 10)));

    let query = supabase
      .from('payments')
      .select('*, order:orders(id, order_number, total_paise, payment_status, customer:customers(id, name, phone))', {
        count: 'exact',
      });

    if (orderId) {
      query = query.eq('order_id', orderId);
    }
    if (method) {
      query = query.eq('payment_method', method);
    }
    if (startDate) {
      query = query.gte('payment_date', startDate);
    }
    if (endDate) {
      query = query.lte('payment_date', endDate);
    }

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    query = query
      .order('payment_date', { ascending: false })
      .order('created_at', { ascending: false })
      .range(from, to);

    const { data: payments, count, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      payments: payments || [],
      total: count || 0,
      page,
      limit,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to fetch payments' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await request.json();

    const validated = recordPaymentSchema.safeParse(body);
    if (!validated.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validated.error.flatten() },
        { status: 400 }
      );
    }

    const {
      order_id,
      amount,
      payment_date,
      payment_method,
      transaction_reference,
      notes,
      idempotency_key,
    } = validated.data;

    // 1. Idempotency protection check
    if (idempotency_key) {
      const { data: existingPayment } = await supabase
        .from('payments')
        .select('*')
        .eq('idempotency_key', idempotency_key)
        .maybeSingle();

      if (existingPayment) {
        return NextResponse.json(
          { payment: existingPayment, duplicate: true },
          { status: 200 }
        );
      }
    }

    const amount_paise = rupeesToPaise(amount);

    // 2. Fetch order to verify
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, total_paise, amount_received_paise, balance_due_paise')
      .eq('id', order_id)
      .single();

    if (orderError || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // 3. Insert payment
    const { data: newPayment, error: paymentError } = await supabase
      .from('payments')
      .insert({
        order_id,
        amount_paise,
        payment_date,
        payment_method,
        transaction_reference: transaction_reference || '',
        notes: notes || '',
        idempotency_key,
        is_void: false,
      })
      .select('*')
      .single();

    if (paymentError) {
      return NextResponse.json({ error: paymentError.message }, { status: 500 });
    }

    // 4. Recalculate order totals
    // Sum active payments for this order
    const { data: allActivePayments } = await supabase
      .from('payments')
      .select('amount_paise')
      .eq('order_id', order_id)
      .eq('is_void', false);

    const netReceivedPaise = (allActivePayments || []).reduce(
      (sum, p) => sum + p.amount_paise,
      0
    );

    const newBalanceDuePaise = Math.max(0, order.total_paise - netReceivedPaise);
    const newStatus = computePaymentStatus(order.total_paise, netReceivedPaise);

    // Update order
    const { data: updatedOrder, error: updateOrderError } = await supabase
      .from('orders')
      .update({
        amount_received_paise: netReceivedPaise,
        balance_due_paise: newBalanceDuePaise,
        payment_status: newStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', order_id)
      .select('*, customer:customers(*)')
      .single();

    if (updateOrderError) {
      console.error('Failed to update order payment balance:', updateOrderError);
    }

    // 5. Audit log
    await logAuditEvent(supabase, {
      entity_type: 'payment',
      entity_id: newPayment.id,
      action: 'recorded',
      changes: {
        order_id,
        amount_paise,
        payment_method,
        new_status: newStatus,
      },
    });

    return NextResponse.json(
      { payment: newPayment, order: updatedOrder },
      { status: 201 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to record payment' },
      { status: 500 }
    );
  }
}
