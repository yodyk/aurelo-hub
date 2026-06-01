// ── Portal: client approval decision endpoint ───────────────────────
// Allows the client (via portal token) to record an approve / changes_requested / reject
// decision on a shared_resource that has needs_approval = true.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const VALID_DECISIONS = new Set(['approved', 'changes_requested', 'rejected']);

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const { token, resource_id, decision, comment } = body || {};

    if (!token || !resource_id || !decision) {
      return json({ error: 'token, resource_id, and decision required' }, 400);
    }
    if (!VALID_DECISIONS.has(decision)) {
      return json({ error: 'Invalid decision' }, 400);
    }
    const cleanComment = typeof comment === 'string' ? comment.slice(0, 2000) : null;

    const sb = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    // Validate token
    const { data: portalToken } = await sb
      .from('portal_tokens')
      .select('client_id, workspace_id, active')
      .eq('token', token)
      .eq('active', true)
      .maybeSingle();
    if (!portalToken) return json({ error: 'Invalid portal link' }, 404);

    // Validate resource belongs to this token's client and is awaiting approval
    const { data: resource } = await sb
      .from('shared_resources')
      .select('id, workspace_id, client_id, needs_approval, status')
      .eq('id', resource_id)
      .maybeSingle();
    if (!resource) return json({ error: 'Resource not found' }, 404);
    if (resource.workspace_id !== portalToken.workspace_id || resource.client_id !== portalToken.client_id) {
      return json({ error: 'Not allowed' }, 403);
    }
    if (!resource.needs_approval) {
      return json({ error: 'Resource is not awaiting approval' }, 400);
    }

    // Insert approval (service role bypasses RLS)
    const { error: insertErr } = await sb.from('resource_approvals').insert({
      workspace_id: portalToken.workspace_id,
      client_id: portalToken.client_id,
      resource_id: resource.id,
      decision,
      comment: cleanComment,
    });
    if (insertErr) return json({ error: insertErr.message }, 500);

    // Update resource status based on decision
    const nextStatus =
      decision === 'approved' ? 'approved' :
      decision === 'rejected' ? 'shared' :
      'for_review';
    // Once decided either way, clear needs_approval so the item leaves the waiting list
    const nextNeedsApproval = decision === 'changes_requested';

    await sb
      .from('shared_resources')
      .update({
        status: nextStatus,
        needs_approval: nextNeedsApproval,
        updated_at: new Date().toISOString(),
      })
      .eq('id', resource.id);

    return json({ ok: true });
  } catch (err) {
    console.error('[portal-resource-decision]', err);
    return json({ error: 'Internal error' }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
