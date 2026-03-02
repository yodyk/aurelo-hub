// ── Resend webhook handler — tracks email delivery events ──────────
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Validate webhook signing secret
  const webhookSecret = Deno.env.get('RESEND_WEBHOOK_SECRET');
  if (!webhookSecret) {
    console.error('RESEND_WEBHOOK_SECRET not configured');
    return new Response(JSON.stringify({ error: 'Webhook not configured' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Verify the svix signature from Resend
  const svixId = req.headers.get('svix-id');
  const svixTimestamp = req.headers.get('svix-timestamp');
  const svixSignature = req.headers.get('svix-signature');

  if (!svixId || !svixTimestamp || !svixSignature) {
    return new Response(JSON.stringify({ error: 'Missing webhook signature headers' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  let body: string;
  try {
    body = await req.text();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid body' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Verify signature using HMAC-SHA256
  const secretBytes = base64Decode(webhookSecret.startsWith('whsec_') ? webhookSecret.slice(6) : webhookSecret);
  const toSign = `${svixId}.${svixTimestamp}.${body}`;
  const key = await crypto.subtle.importKey(
    'raw',
    secretBytes,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signatureBytes = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(toSign));
  const expectedSig = btoa(String.fromCharCode(...new Uint8Array(signatureBytes)));

  // Resend sends multiple signatures separated by spaces, check if any match
  const signatures = svixSignature.split(' ').map(s => s.replace(/^v1,/, ''));
  const isValid = signatures.some(sig => sig === expectedSig);

  if (!isValid) {
    console.error('Invalid webhook signature');
    return new Response(JSON.stringify({ error: 'Invalid signature' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const payload = JSON.parse(body);
  const eventType = payload.type; // e.g. email.sent, email.delivered, email.bounced, email.opened, email.complained

  // Map Resend event types to our simplified types
  const eventMap: Record<string, string> = {
    'email.sent': 'sent',
    'email.delivered': 'delivered',
    'email.delivery_delayed': 'delayed',
    'email.bounced': 'bounced',
    'email.complained': 'complained',
    'email.opened': 'opened',
    'email.clicked': 'clicked',
  };

  const mappedEvent = eventMap[eventType];
  if (!mappedEvent) {
    // Unrecognised event type — acknowledge but don't store
    return new Response(JSON.stringify({ ok: true, skipped: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const resendEmailId = payload.data?.email_id;
  const recipient = payload.data?.to?.[0] || payload.data?.email || '';

  if (!resendEmailId) {
    return new Response(JSON.stringify({ error: 'No email_id in payload' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Use service role to bypass RLS
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  // Look up which notification this email belongs to (stored in metadata.resend_email_id)
  const { data: notifData } = await supabase
    .from('notifications')
    .select('id, workspace_id')
    .contains('metadata', { resend_email_id: resendEmailId })
    .maybeSingle();

  const workspaceId = notifData?.workspace_id;
  const notificationId = notifData?.id;

  if (!workspaceId) {
    // Can't link to a workspace — still acknowledge to prevent Resend retries
    console.warn(`No notification found for resend email ${resendEmailId}`);
    return new Response(JSON.stringify({ ok: true, linked: false }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Insert the event
  const { error: insertErr } = await supabase.from('email_events').insert({
    workspace_id: workspaceId,
    notification_id: notificationId,
    resend_email_id: resendEmailId,
    recipient,
    event_type: mappedEvent,
    bounce_type: mappedEvent === 'bounced' ? (payload.data?.bounce?.type || null) : null,
    raw_payload: payload.data || {},
  });

  if (insertErr) {
    console.error('Failed to insert email event:', insertErr);
    return new Response(JSON.stringify({ error: 'DB insert failed' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  console.log(`Email event recorded: ${mappedEvent} for ${resendEmailId}`);
  return new Response(JSON.stringify({ ok: true, event: mappedEvent }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});

function base64Decode(str: string): Uint8Array {
  const binary = atob(str);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}
