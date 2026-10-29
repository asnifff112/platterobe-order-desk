import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { computePaymentStatus, logAuditEvent } from '@/lib/services/order';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const body = await request.json().catch(() => ({}));

    // 1. Fetch payment
    const { data: payment, error: fetchError } = await supabase
      .from('payments')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !payment) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
    }

    if (payment.is_void) {
      return NextResponse.json({ error: 'Payment is already voided' }, { status: 400 });
    }

    // 2. Mark as void
    const { data: voidedPayment, error: voidError } = await supabase
      .from('payments')
      .update({
        is_void: true,
        voided_at: new Date().toISOString(),
        voided_reason: body.reason || 'Voided by admin',
      })
      .eq('id', id)
      .select('*')
      .single();

    if (voidError) {
      return NextResponse.json({ error: voidError.message }, { status: 500 });
    }

    // 3. Recalculate order payment totals
    const orderId = payment.order_id;
    const { data: order } = await supabase
      .from('orders')
      .select('id, total_paise')
      .eq('id', orderId)
      .single();

    if (order) {
      const { data: activePayments } = await supabase
        .from('payments')
        .select('amount_paise')
        .eq('order_id', orderId)
        .eq('is_void', false);

      const netReceivedPaise = (activePayments || []).reduce(
        (sum, p) => sum + p.amount_paise,
        0
      );

      const newBalance = Math.max(0, order.total_paise - netReceivedPaise);
      const newStatus = computePaymentStatus(order.total_paise, netReceivedPaise);

      await supabase
        .from('orders')
        .update({
          amount_received_paise: netReceivedPaise,
          balance_due_paise: newBalance,
          payment_status: newStatus,
          updated_at: new Date().toISOString(),
        })
        .eq('id', orderId);
    }

    await logAuditEvent(supabase, {
      entity_type: 'payment',
      entity_id: id,
      action: 'voided',
      changes: {
        order_id: payment.order_id,
        amount_paise: payment.amount_paise,
        reason: body.reason,
      },
    });

    return NextResponse.json({ payment: voidedPayment });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to void payment' },
      { status: 500 }
    );
  }
}
