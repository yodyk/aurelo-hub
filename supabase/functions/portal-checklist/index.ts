// ── Portal checklist mutations (unauthenticated, token-based) ────────
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { token, action, checklist_id, item_id, text, completed } = await req.json();
    if (!token) {
      return new Response(JSON.stringify({ error: 'Token required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const sb = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    // Validate token
    const { data: portalToken, error: tokenError } = await sb
      .from('portal_tokens')
      .select('client_id, workspace_id, active')
      .eq('token', token)
      .eq('active', true)
      .maybeSingle();

    if (tokenError || !portalToken) {
      return new Response(JSON.stringify({ error: 'Invalid or expired portal link' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify checklist belongs to this client/workspace
    if (checklist_id) {
      const { data: checklist } = await sb
        .from('checklists')
        .select('id')
        .eq('id', checklist_id)
        .eq('client_id', portalToken.client_id)
        .eq('workspace_id', portalToken.workspace_id)
        .maybeSingle();

      if (!checklist) {
        return new Response(JSON.stringify({ error: 'Checklist not found' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    let result: any = null;

    if (action === 'toggle' && item_id) {
      // Verify the item belongs to a checklist owned by this portal's client/workspace
      const { data: item } = await sb
        .from('checklist_items')
        .select('id, completed, checklist_id, checklists!inner(client_id, workspace_id)')
        .eq('id', item_id)
        .eq('checklists.client_id', portalToken.client_id)
        .eq('checklists.workspace_id', portalToken.workspace_id)
        .maybeSingle();

      if (!item) {
        return new Response(JSON.stringify({ error: 'Item not found' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { error } = await sb
        .from('checklist_items')
        .update({ completed: completed !== undefined ? completed : !item.completed })
        .eq('id', item_id);

      if (error) throw error;
      result = { success: true };

    } else if (action === 'add' && checklist_id && text) {
      // Add a new item (client-side)
      const { data: maxOrder } = await sb
        .from('checklist_items')
        .select('sort_order')
        .eq('checklist_id', checklist_id)
        .order('sort_order', { ascending: false })
        .limit(1)
        .maybeSingle();

      const nextOrder = (maxOrder?.sort_order ?? -1) + 1;

      const { data: newItem, error } = await sb
        .from('checklist_items')
        .insert({
          checklist_id,
          text: text.trim(),
          sort_order: nextOrder,
          added_by: 'client',
        })
        .select()
        .single();

      if (error) throw error;
      result = { item: newItem };

    } else {
      return new Response(JSON.stringify({ error: 'Invalid action' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[portal-checklist]', err);
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
