// ── Send retainer-warning email via Resend ─────────────────────────
// Called from the client when a retainer crosses the workspace threshold.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface RetainerEmailPayload {
  clientName: string;
  clientEmail: string;
  pctUsed: number;
  hoursRemaining: number;
  hoursTotal: number;
  workspaceName?: string;
  workspaceLogoUrl?: string;
}

const WORDMARK_URL =
  'https://oqrqypuulgeqzjcgqruw.supabase.co/storage/v1/object/public/email-assets/aurelo-wordmark.png';

function buildHtml(p: RetainerEmailPayload): string {
  const remaining = p.hoursRemaining.toFixed(1);
  const total = p.hoursTotal.toFixed(1);
  const used = (p.hoursTotal - p.hoursRemaining).toFixed(1);
  const wsName = p.workspaceName || 'your service provider';
  const pct = Math.min(Math.round(p.pctUsed), 100);
  const pctLeft = 100 - pct;

  // Bar color shifts from blue → warm amber as usage increases
  const barColor = pct >= 90 ? '#c4783e' : pct >= 75 ? '#bfa044' : '#2e7d9a';

  const logoHtml = p.workspaceLogoUrl
    ? `<td style="vertical-align:middle"><img src="${p.workspaceLogoUrl}" alt="${wsName}" height="28" style="display:inline-block;vertical-align:middle" /></td>`
    : `<td style="vertical-align:middle"><span style="font-size:16px;font-weight:700;color:#1a1a19">${wsName}</span></td>`;

  return `
<!DOCTYPE html>
<html lang="en" dir="ltr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
</head>
<body style="margin:0;padding:0;background:#ffffff;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:40px 16px">
    <table width="480" cellpadding="0" cellspacing="0" style="max-width:480px;border:1px solid #e8e8e6;border-radius:12px;overflow:hidden">

      <!-- Header bar -->
      <tr><td style="background:#f8f8f7;padding:24px 32px;border-bottom:1px solid #e8e8e6">
        <table width="100%" cellpadding="0" cellspacing="0"><tr>
          ${logoHtml}
          <td style="vertical-align:middle;text-align:right">
            <img src="${WORDMARK_URL}" alt="aurelo" height="18" style="display:inline-block;vertical-align:middle;opacity:0.9" />
          </td>
        </tr></table>
      </td></tr>

      <!-- Accent strip -->
      <tr><td style="height:3px;background:linear-gradient(90deg,#2e7d9a 0%,#1e5f75 100%)"></td></tr>

      <!-- Content -->
      <tr><td style="padding:32px 32px 24px">
        <p style="font-size:11px;font-weight:600;color:#2e7d9a;letter-spacing:0.1em;margin:0 0 8px;text-transform:uppercase">Retainer Update</p>
        <h1 style="font-size:24px;font-weight:700;color:#1a1a19;letter-spacing:-0.02em;margin:0 0 16px;line-height:1.2">
          ${pct}% of hours used
        </h1>
        <p style="font-size:14px;color:#52524e;line-height:1.7;margin:0 0 28px">
          Hi <strong>${p.clientName}</strong>, here's a snapshot of your retainer with <strong>${wsName}</strong>.
        </p>

        <!-- Visual progress bar -->
        <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 8px">
          <tr>
            <td style="background:#f0f0ee;border-radius:6px;overflow:hidden;height:24px;padding:0">
              <table width="100%" cellpadding="0" cellspacing="0" style="height:24px"><tr>
                <td style="width:${pct}%;background:${barColor};border-radius:${pctLeft === 0 ? '6px' : '6px 0 0 6px'};height:24px"></td>
                <td style="width:${pctLeft}%;height:24px"></td>
              </tr></table>
            </td>
          </tr>
        </table>
        <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 28px">
          <tr>
            <td style="font-size:12px;color:#52524e"><strong style="color:${barColor}">${used}h</strong> used</td>
            <td style="font-size:12px;color:#52524e;text-align:right"><strong>${remaining}h</strong> remaining of ${total}h</td>
          </tr>
        </table>

        <!-- Detail card -->
        <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9f9f8;border-radius:8px;margin:0 0 28px">
          <tr>
            <td style="padding:16px 20px">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="font-size:13px;color:#8a8a86;padding:4px 0">Hours used</td>
                  <td style="font-size:14px;font-weight:600;color:#1a1a19;text-align:right;padding:4px 0">${used}h of ${total}h</td>
                </tr>
                <tr>
                  <td style="font-size:13px;color:#8a8a86;padding:4px 0">Remaining</td>
                  <td style="font-size:14px;font-weight:600;color:#1a1a19;text-align:right;padding:4px 0">${remaining}h</td>
                </tr>
                <tr>
                  <td style="font-size:13px;color:#8a8a86;padding:4px 0">Usage</td>
                  <td style="font-size:14px;font-weight:600;color:${barColor};text-align:right;padding:4px 0">${pct}%</td>
                </tr>
              </table>
            </td>
          </tr>
        </table>

        <p style="font-size:14px;color:#52524e;line-height:1.7;margin:0">
          If you'd like to discuss extending or renewing your retainer, please don't hesitate to reach out.
        </p>
      </td></tr>

      <!-- Divider -->
      <tr><td style="padding:0 32px"><hr style="border:none;border-top:1px solid #e8e8e6;margin:0" /></td></tr>

      <!-- Footer -->
      <tr><td style="padding:16px 32px 24px">
        <p style="font-size:12px;color:#a8a29e;margin:0 0 8px;line-height:1.5">
          This is an automated notification from ${wsName}.
        </p>
        <p style="font-size:11px;color:#c4c4c0;margin:0">
          Sent with <a href="https://getaurelo.com" style="color:#2e7d9a;text-decoration:none">Aurelo</a>
        </p>
      </td></tr>

    </table>
  </td></tr></table>
</body>
</html>`;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Require authenticated caller — prevents open email-relay abuse
  const authHeader = req.headers.get('Authorization') || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!token) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
  const authClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data: userData, error: userErr } = await authClient.auth.getUser(token);
  if (userErr || !userData?.user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const resendKey = Deno.env.get('RESEND_API_KEY');
  if (!resendKey) {
    console.error('RESEND_API_KEY is not configured');
    return new Response(JSON.stringify({ error: 'Email service not configured' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const payload: RetainerEmailPayload = await req.json();

    if (!payload.clientEmail || !payload.clientName) {
      return new Response(JSON.stringify({ error: 'clientEmail and clientName are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify the clientEmail matches a real client in a workspace the caller belongs to
    const { data: matchingClient } = await authClient
      .from('clients')
      .select('id')
      .eq('contact_email', payload.clientEmail)
      .limit(1)
      .maybeSingle();
    if (!matchingClient) {
      return new Response(JSON.stringify({ error: 'Recipient not found in your workspace' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const html = buildHtml(payload);
    const wsName = payload.workspaceName || 'Aurelo';

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: `${wsName} <noreply@getaurelo.com>`,
        to: [payload.clientEmail],
        subject: `Retainer Update — ${Math.round(payload.pctUsed)}% used`,
        html,
      }),
    });

    const result = await res.json();

    if (!res.ok) {
      console.error('Resend API error:', result);
      return new Response(JSON.stringify({ error: 'Failed to send email', detail: result }), {
        status: res.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Retainer email sent:', result);

    // Store resend email ID back via response so client can link it to the notification
    return new Response(JSON.stringify({ success: true, id: result.id, resend_email_id: result.id }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('send-retainer-email error:', message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
