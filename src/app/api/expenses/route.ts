import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createExpenseSchema } from '@/lib/validations';
import { rupeesToPaise } from '@/lib/utils/currency';
import { logAuditEvent } from '@/lib/services/order';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);

    const category = searchParams.get('category');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '25', 10)));

    let query = supabase.from('expenses').select('*', { count: 'exact' });

    if (category) {
      query = query.eq('category', category);
    }
    if (startDate) {
      query = query.gte('expense_date', startDate);
    }
    if (endDate) {
      query = query.lte('expense_date', endDate);
    }

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    query = query
      .order('expense_date', { ascending: false })
      .range(from, to);

    const { data: expenses, count, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Calculate total amount for the filtered set
    let totalPaise = 0;
    (expenses || []).forEach((e) => {
      totalPaise += e.amount_paise || 0;
    });

    return NextResponse.json({
      expenses: expenses || [],
      total: count || 0,
      total_paise: totalPaise,
      page,
      limit,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to fetch expenses' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await request.json();

    const validated = createExpenseSchema.safeParse(body);
    if (!validated.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validated.error.flatten() },
        { status: 400 }
      );
    }

    const { title, category, amount, expense_date, payment_method, vendor, description } =
      validated.data;

    const amount_paise = rupeesToPaise(amount);

    const { data: expense, error } = await supabase
      .from('expenses')
      .insert({
        title,
        category,
        amount_paise,
        expense_date,
        payment_method,
        vendor: vendor || '',
        description: description || '',
      })
      .select('*')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await logAuditEvent(supabase, {
      entity_type: 'expense',
      entity_id: expense.id,
      action: 'created',
      changes: {
        title,
        category,
        amount_paise,
      },
    });

    return NextResponse.json({ expense }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to create expense' },
      { status: 500 }
    );
  }
}
