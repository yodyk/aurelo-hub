// ── Send retainer-warning email via Resend ─────────────────────────
// Called from the client when a retainer crosses the workspace threshold.

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
}

function buildHtml(p: RetainerEmailPayload): string {
  const remaining = p.hoursRemaining.toFixed(1);
  const total = p.hoursTotal.toFixed(1);
  const wsName = p.workspaceName || 'your service provider';

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#ffffff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:40px auto;padding:0 20px">
    <tr><td style="padding-bottom:24px;border-bottom:1px solid #e5e7eb">
      <h1 style="margin:0;font-size:20px;font-weight:600;color:#111827">Retainer Update</h1>
    </td></tr>
    <tr><td style="padding:24px 0">
      <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#374151">
        Hi <strong>${p.clientName}</strong>,
      </p>
      <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#374151">
        Your retainer with <strong>${wsName}</strong> has reached
        <strong style="color:#b45309">${Math.round(p.pctUsed)}%</strong> usage.
      </p>
      <table cellpadding="0" cellspacing="0" style="background:#f9fafb;border-radius:8px;padding:16px;width:100%;margin-bottom:16px">
        <tr>
          <td style="font-size:13px;color:#6b7280;padding:4px 16px 4px 0">Hours used</td>
          <td style="font-size:15px;font-weight:600;color:#111827">${(p.hoursTotal - p.hoursRemaining).toFixed(1)}h of ${total}h</td>
        </tr>
        <tr>
          <td style="font-size:13px;color:#6b7280;padding:4px 16px 4px 0">Remaining</td>
          <td style="font-size:15px;font-weight:600;color:#111827">${remaining}h</td>
        </tr>
      </table>
      <p style="margin:0;font-size:14px;line-height:1.6;color:#6b7280">
        If you'd like to discuss extending or renewing your retainer, please don't hesitate to reach out.
      </p>
    </td></tr>
    <tr><td style="padding-top:24px;border-top:1px solid #e5e7eb">
      <p style="margin:0;font-size:12px;color:#9ca3af">
        Sent by ${wsName} via Aurelo
      </p>
    </td></tr>
  </table>
</body>
</html>`;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
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

    const html = buildHtml(payload);
    const wsName = payload.workspaceName || 'Aurelo';

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: `${wsName} <onboarding@resend.dev>`,
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
    return new Response(JSON.stringify({ success: true, id: result.id }), {
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
