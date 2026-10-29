import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { normalizePhone } from '@/lib/utils/phone';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('*')
      .eq('id', id)
      .single();

    if (customerError || !customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    // Get order history
    const { data: orders } = await supabase
      .from('orders')
      .select('*')
      .eq('customer_id', id)
      .order('order_date', { ascending: false });

    return NextResponse.json({
      customer,
      orders: orders || [],
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to fetch customer' },
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

    const updates: Record<string, unknown> = {};
    if (body.name !== undefined) updates.name = body.name.trim();
    if (body.phone !== undefined) {
      updates.phone = body.phone.trim();
      updates.phone_normalized = normalizePhone(body.phone);
    }
    if (body.default_address !== undefined) updates.default_address = body.default_address;
    if (body.email !== undefined) updates.email = body.email;
    if (body.notes !== undefined) updates.notes = body.notes;

    const { data: customer, error } = await supabase
      .from('customers')
      .update(updates)
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ customer });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to update customer' },
      { status: 500 }
    );
  }
}
