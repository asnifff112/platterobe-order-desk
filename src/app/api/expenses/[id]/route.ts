import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { rupeesToPaise } from '@/lib/utils/currency';
import { logAuditEvent } from '@/lib/services/order';

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    const { error } = await supabase.from('expenses').delete().eq('id', id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await logAuditEvent(supabase, {
      entity_type: 'expense',
      entity_id: id,
      action: 'deleted',
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to delete expense' },
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
    if (body.title !== undefined) updates.title = body.title;
    if (body.category !== undefined) updates.category = body.category;
    if (body.amount !== undefined) updates.amount_paise = rupeesToPaise(body.amount);
    if (body.expense_date !== undefined) updates.expense_date = body.expense_date;
    if (body.payment_method !== undefined) updates.payment_method = body.payment_method;
    if (body.vendor !== undefined) updates.vendor = body.vendor;
    if (body.description !== undefined) updates.description = body.description;

    const { data: expense, error } = await supabase
      .from('expenses')
      .update(updates)
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ expense });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to update expense' },
      { status: 500 }
    );
  }
}
