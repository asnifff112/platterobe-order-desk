import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Use service role or anon client for webhook
function getWebhookSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createClient(url, key);
}

// Verification endpoint for Meta
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  const verifyToken = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN;

  if (mode === 'subscribe' && token === verifyToken) {
    return new NextResponse(challenge, { status: 200 });
  }

  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}

// Status callback endpoint for Meta
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const supabase = getWebhookSupabaseClient();

    // Check entry -> changes -> value -> statuses
    const entry = body?.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;
    const statuses = value?.statuses;

    if (Array.isArray(statuses)) {
      for (const statusObj of statuses) {
        const messageId = statusObj.id;
        const status = statusObj.status; // 'sent' | 'delivered' | 'read' | 'failed'
        const timestamp = statusObj.timestamp
          ? new Date(parseInt(statusObj.timestamp, 10) * 1000).toISOString()
          : new Date().toISOString();

        const updates: Record<string, unknown> = {
          status,
          updated_at: new Date().toISOString(),
        };

        if (status === 'delivered') updates.delivered_at = timestamp;
        if (status === 'read') updates.read_at = timestamp;
        if (status === 'failed') {
          updates.error_message = statusObj.errors?.[0]?.title || 'Message delivery failed';
        }

        await supabase
          .from('whatsapp_messages')
          .update(updates)
          .eq('whatsapp_message_id', messageId);
      }
    }

    return NextResponse.json({ status: 'ok' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
