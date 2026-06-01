// ── Portal Q&A endpoint ─────────────────────────────────────────────
// Token-gated. Lets the client ask a new question or answer one the
// freelancer asked them. Service role bypasses RLS after token validation.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const { token, action, question, project_id, question_id, answer } = body || {};
    if (!token || !action) return json({ error: 'token and action required' }, 400);

    const sb = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    const { data: portalToken } = await sb
      .from('portal_tokens')
      .select('client_id, workspace_id, active')
      .eq('token', token)
      .eq('active', true)
      .maybeSingle();
    if (!portalToken) return json({ error: 'Invalid portal link' }, 404);

    if (action === 'ask') {
      const q = String(question || '').trim();
      if (!q) return json({ error: 'question required' }, 400);
      if (q.length > 4000) return json({ error: 'question too long' }, 400);
      const { data, error } = await sb
        .from('portal_questions')
        .insert({
          workspace_id: portalToken.workspace_id,
          client_id: portalToken.client_id,
          project_id: project_id || null,
          asked_by: 'client',
          question: q,
          status: 'open',
        })
        .select('id')
        .single();
      if (error) return json({ error: error.message }, 500);
      return json({ ok: true, id: data.id });
    }

    if (action === 'answer') {
      if (!question_id) return json({ error: 'question_id required' }, 400);
      const a = String(answer || '').trim();
      if (!a) return json({ error: 'answer required' }, 400);
      if (a.length > 4000) return json({ error: 'answer too long' }, 400);

      // Validate question is for this client + asked by owner
      const { data: existing } = await sb
        .from('portal_questions')
        .select('id, workspace_id, client_id, asked_by, status')
        .eq('id', question_id)
        .maybeSingle();
      if (!existing) return json({ error: 'Question not found' }, 404);
      if (existing.workspace_id !== portalToken.workspace_id || existing.client_id !== portalToken.client_id) {
        return json({ error: 'Not allowed' }, 403);
      }
      if (existing.asked_by !== 'owner') return json({ error: 'Not an owner question' }, 400);

      const { error } = await sb
        .from('portal_questions')
        .update({
          answer: a,
          answered_at: new Date().toISOString(),
          answered_by: 'client',
          status: 'answered',
        })
        .eq('id', question_id);
      if (error) return json({ error: error.message }, 500);
      return json({ ok: true });
    }

    return json({ error: 'Unknown action' }, 400);
  } catch (err) {
    console.error('[portal-question]', err);
    return json({ error: 'Internal error' }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
