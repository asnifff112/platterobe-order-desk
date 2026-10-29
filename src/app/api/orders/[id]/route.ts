import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { logAuditEvent } from '@/lib/services/order';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // Fetch order with customer
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*, customer:customers(*)')
      .eq('id', id)
      .single();

    if (orderError || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Fetch order items
    const { data: items } = await supabase
      .from('order_items')
      .select('*')
      .eq('order_id', id)
      .order('sort_order', { ascending: true });

    // Fetch payments
    const { data: payments } = await supabase
      .from('payments')
      .select('*')
      .eq('order_id', id)
      .order('payment_date', { ascending: false });

    // Fetch invoices
    const { data: invoices } = await supabase
      .from('invoices')
      .select('*')
      .eq('order_id', id)
      .order('version', { ascending: false });

    const orderWithDetails = {
      ...order,
      items: items || [],
      payments: payments || [],
      invoices: invoices || [],
    };

    return NextResponse.json({ order: orderWithDetails });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to fetch order details' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const body = await request.json();

    const allowedUpdates: Record<string, unknown> = {};

    if (body.order_status) {
      allowedUpdates.order_status = body.order_status;
      if (body.order_status === 'Cancelled') {
        allowedUpdates.cancelled_at = new Date().toISOString();
        allowedUpdates.cancelled_reason = body.cancelled_reason || 'Cancelled by admin';
      }
    }

    if (body.delivery_date !== undefined) {
      allowedUpdates.delivery_date = body.delivery_date || null;
    }
    if (body.delivery_address !== undefined) {
      allowedUpdates.delivery_address = body.delivery_address;
    }
    if (body.order_notes !== undefined) {
      allowedUpdates.order_notes = body.order_notes;
    }
    if (body.admin_notes !== undefined) {
      allowedUpdates.admin_notes = body.admin_notes;
    }

    const { data: updatedOrder, error: updateError } = await supabase
      .from('orders')
      .update(allowedUpdates)
      .eq('id', id)
      .select('*, customer:customers(*)')
      .single();

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    await logAuditEvent(supabase, {
      entity_type: 'order',
      entity_id: id,
      action: 'updated',
      changes: allowedUpdates,
    });

    return NextResponse.json({ order: updatedOrder });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to update order' },
      { status: 500 }
    );
  }
}
