// ── Portal task mutations (unauthenticated, token-based) ─────────────
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const ALLOWED_STATUSES = ['to_do', 'in_progress', 'in_review', 'on_hold', 'complete'];

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const {
      token,
      action,
      checklist_id,
      item_id,
      text,
      completed,
      status,
      work_tags,
      due_date,
      estimated_hours,
      priority,
      description,
    } = body;

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
        return new Response(JSON.stringify({ error: 'List not found' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Helper: verify item ownership through checklists join
    async function verifyItem(id: string) {
      const { data: item } = await sb
        .from('checklist_items')
        .select('id, completed, status, checklist_id, checklists!inner(client_id, workspace_id)')
        .eq('id', id)
        .eq('checklists.client_id', portalToken.client_id)
        .eq('checklists.workspace_id', portalToken.workspace_id)
        .maybeSingle();
      return item;
    }

    let result: any = null;

    if (action === 'toggle' && item_id) {
      const item = await verifyItem(item_id);
      if (!item) {
        return new Response(JSON.stringify({ error: 'Task not found' }), {
          status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const nextCompleted = completed !== undefined ? !!completed : !item.completed;
      const nextStatus = nextCompleted ? 'complete' : (item.status === 'complete' ? 'to_do' : item.status);
      const { error } = await sb
        .from('checklist_items')
        .update({ status: nextStatus })
        .eq('id', item_id);
      if (error) throw error;
      result = { success: true, status: nextStatus, completed: nextCompleted };


    } else if (action === 'update_status' && item_id) {
      if (!ALLOWED_STATUSES.includes(status)) {
        return new Response(JSON.stringify({ error: 'Invalid status' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const item = await verifyItem(item_id);
      if (!item) {
        return new Response(JSON.stringify({ error: 'Task not found' }), {
          status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const { error } = await sb
        .from('checklist_items')
        .update({ status })
        .eq('id', item_id);
      if (error) throw error;
      result = { success: true, status };

    } else if (action === 'add' && checklist_id && text) {
      const { data: maxOrder } = await sb
        .from('checklist_items')
        .select('sort_order')
        .eq('checklist_id', checklist_id)
        .order('sort_order', { ascending: false })
        .limit(1)
        .maybeSingle();

      const nextOrder = (maxOrder?.sort_order ?? -1) + 1;

      // Sanitize optional fields from client input
      const safeTags = Array.isArray(work_tags)
        ? work_tags.filter((t: unknown) => typeof t === 'string').slice(0, 6)
        : [];
      const safeDueDate = typeof due_date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(due_date) ? due_date : null;
      const safeHours = typeof estimated_hours === 'number' && estimated_hours >= 0 && estimated_hours < 10000
        ? estimated_hours : null;
      const safePriority = ['low', 'medium', 'high'].includes(priority) ? priority : null;
      const safeDescription = typeof description === 'string' ? description.slice(0, 2000) : null;

      const { data: newItem, error } = await sb
        .from('checklist_items')
        .insert({
          checklist_id,
          text: String(text).trim().slice(0, 500),
          description: safeDescription,
          sort_order: nextOrder,
          added_by: 'client',
          status: 'todo',
          work_tags: safeTags,
          due_date: safeDueDate,
          estimated_hours: safeHours,
          priority: safePriority,
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
