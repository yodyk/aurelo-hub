// Sends an approval notification email to joe@getaurelo.com when a new user signs up
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authenticate caller: must be a signed-in user
    const authHeader = req.headers.get('Authorization') || '';
    const token = authHeader.replace('Bearer ', '');
    if (!token) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const { createClient } = await import('npm:@supabase/supabase-js@2.57.2');
    const sb = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: `Bearer ${token}` } } },
    );
    const { data: userData, error: userErr } = await sb.auth.getUser(token);
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { userName, userEmail, workspaceId } = await req.json();

    const escapeHtml = (s: string) =>
      String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    const safeName = escapeHtml(userName);
    const safeEmail = escapeHtml(userEmail);
    const safeWorkspaceId = encodeURIComponent(String(workspaceId ?? ''));
    const safeWorkspaceIdHtml = escapeHtml(workspaceId);

    const approveSecret = Deno.env.get('APPROVE_SECRET');
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const resendKey = Deno.env.get('RESEND_API_KEY');

    if (!resendKey) {
      console.error('RESEND_API_KEY not set');
      return new Response(JSON.stringify({ error: 'Email not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const approveUrl = `${supabaseUrl}/functions/v1/approve-user?workspace_id=${safeWorkspaceId}&token=${approveSecret}`;

    const html = `
      <div style="font-family:system-ui,-apple-system,sans-serif;max-width:500px;margin:0 auto;padding:24px">
        <h2 style="font-size:18px;color:#1c1c1c;margin:0 0 16px">New Aurelo Signup — Approval Needed</h2>
        <div style="background:#f9f9f8;border:1px solid #e5e5e5;border-radius:12px;padding:20px;margin-bottom:20px">
          <p style="margin:0 0 8px;font-size:14px;color:#717182"><strong style="color:#1c1c1c">Name:</strong> ${safeName}</p>
          <p style="margin:0 0 8px;font-size:14px;color:#717182"><strong style="color:#1c1c1c">Email:</strong> ${safeEmail}</p>
          <p style="margin:0;font-size:14px;color:#717182"><strong style="color:#1c1c1c">Workspace ID:</strong> ${safeWorkspaceIdHtml}</p>
        </div>
        <a href="${approveUrl}" style="display:inline-block;padding:10px 24px;background:#2e7d9a;color:#fff;text-decoration:none;border-radius:8px;font-size:14px;font-weight:500">
          Approve this user
        </a>
        <p style="font-size:12px;color:#b0b0b8;margin-top:16px">If you don't recognize this signup, you can ignore this email.</p>
      </div>
    `;

    const emailRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Aurelo <notify@notify.getaurelo.com>',
        to: ['joe@getaurelo.com'],
        subject: `New signup: ${userName} (${userEmail})`,
        html,
      }),
    });

    if (!emailRes.ok) {
      const errText = await emailRes.text();
      console.error('Resend error:', errText);
      return new Response(JSON.stringify({ error: 'Email send failed' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('notify-signup error:', err);
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
