// Approves a waitlisted user's workspace via a secret token link
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const workspaceId = url.searchParams.get('workspace_id');
    const token = url.searchParams.get('token');

    const adminSecret = Deno.env.get('APPROVE_SECRET');
    if (!adminSecret || token !== adminSecret) {
      return new Response('Unauthorized', { status: 401, headers: corsHeaders });
    }

    if (!workspaceId) {
      return new Response('Missing workspace_id', { status: 400, headers: corsHeaders });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { error } = await supabase
      .from('workspaces')
      .update({ is_approved: true })
      .eq('id', workspaceId);

    if (error) {
      console.error('Approve error:', error);
      return new Response(`Failed: ${error.message}`, { status: 500, headers: corsHeaders });
    }

    // Return a simple HTML success page
    return new Response(
      `<!DOCTYPE html>
<html><head><title>User Approved</title>
<style>body{font-family:system-ui;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#fafaf9}
.card{text-align:center;padding:40px;border-radius:16px;border:1px solid #e5e5e5;background:#fff;max-width:400px}
h1{font-size:20px;color:#1c1c1c;margin:0 0 8px}p{font-size:14px;color:#717182;margin:0}
.check{width:48px;height:48px;border-radius:50%;background:#2e7d9a20;display:flex;align-items:center;justify-content:center;margin:0 auto 16px;font-size:24px}</style>
</head><body><div class="card"><div class="check">✓</div><h1>User Approved</h1><p>The workspace has been approved. The user can now access Aurelo.</p></div></body></html>`,
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'text/html' },
      },
    );
  } catch (err) {
    console.error('Approve error:', err);
    return new Response('Internal error', { status: 500, headers: corsHeaders });
  }
});
