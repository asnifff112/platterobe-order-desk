import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isWhatsAppCloudConfigured } from '@/lib/services/whatsapp';
import { logAuditEvent } from '@/lib/services/order';

export async function GET() {
  try {
    const supabase = await createClient();

    const fetchResult = await supabase
      .from('business_settings')
      .select('*')
      .maybeSingle();

    let settings = fetchResult.data;
    const error = fetchResult.error;

    if (!settings && !error) {
      // Seed default
      const { data: created, error: insertError } = await supabase
        .from('business_settings')
        .insert({
          business_name: 'PLATTEROBE',
          store_display_name: 'PLATTEROBE Gourmet & Catering',
          address: 'Main Road, Parappanangadi, Kerala, India',
          phone: '+91 98460 12345',
          email: 'orders@platterobe.com',
          currency: 'INR',
          invoice_prefix: 'INV',
          order_prefix: 'ORD',
          invoice_footer: 'Thank you for choosing PLATTEROBE! Enjoy your meal.',
          signatory_name: 'Authorized Signatory',
          show_original_price_on_invoice: false,
          show_delivery_address_on_invoice: true,
          default_payment_method: 'UPI',
        })
        .select('*')
        .single();

      if (!insertError) {
        settings = created;
      }
    }

    if (error && !settings) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      settings,
      whatsappCloudConfigured: isWhatsAppCloudConfigured(),
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to fetch settings' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await request.json();

    const { data: currentSettings } = await supabase
      .from('business_settings')
      .select('id')
      .maybeSingle();

    if (!currentSettings) {
      return NextResponse.json({ error: 'Settings not initialized' }, { status: 404 });
    }

    const allowedFields = [
      'business_name',
      'store_display_name',
      'address',
      'phone',
      'email',
      'invoice_prefix',
      'order_prefix',
      'invoice_footer',
      'signatory_name',
      'show_original_price_on_invoice',
      'show_delivery_address_on_invoice',
      'default_payment_method',
    ];

    const updates: Record<string, unknown> = {};
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updates[field] = body[field];
      }
    }

    const { data: updated, error } = await supabase
      .from('business_settings')
      .update(updates)
      .eq('id', currentSettings.id)
      .select('*')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await logAuditEvent(supabase, {
      entity_type: 'settings',
      entity_id: currentSettings.id,
      action: 'updated',
      changes: updates,
    });

    return NextResponse.json({ settings: updated });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to update settings' },
      { status: 500 }
    );
  }
}
