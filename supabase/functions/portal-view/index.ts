// ── Public portal data endpoint ─────────────────────────────────────
// Returns client data, projects, sessions, invoices, and branding for a portal token.
// No auth required — uses service role key to fetch scoped data.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const token = url.searchParams.get('token');
    if (!token) {
      return new Response(JSON.stringify({ error: 'Token required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const sb = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    // 1. Look up token
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

    const { client_id, workspace_id } = portalToken;

    // 2. Fetch all data in parallel
    const [
      clientRes,
      projectsRes,
      sessionsRes,
      invoicesRes,
      workspaceRes,
      brandingRes,
      checklistsRes,
    ] = await Promise.all([
      sb.from('clients').select('*').eq('id', client_id).single(),
      sb.from('projects').select('*').eq('client_id', client_id).eq('workspace_id', workspace_id).order('created_at', { ascending: false }),
      sb.from('sessions').select('*').eq('client_id', client_id).eq('workspace_id', workspace_id).order('date', { ascending: false }).limit(100),
      sb.from('invoices').select('*').eq('client_id', client_id).eq('workspace_id', workspace_id).order('created_at', { ascending: false }),
      sb.from('workspaces').select('name, plan_id').eq('id', workspace_id).single(),
      sb.from('workspace_settings').select('data').eq('workspace_id', workspace_id).eq('section', 'workspace').maybeSingle(),
      sb.from('checklists').select('*').eq('client_id', client_id).eq('workspace_id', workspace_id).order('created_at', { ascending: true }),
    ]);

    if (clientRes.error || !clientRes.data) {
      return new Response(JSON.stringify({ error: 'Client not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const client = clientRes.data;
    const workspace = workspaceRes.data;
    const wsSettings = brandingRes.data?.data as Record<string, any> | null;
    const planId = workspace?.plan_id || 'starter';
    const isWhiteLabel = planId === 'studio';

    // 3. Resolve logo URLs from storage
    let logoUrl: string | null = null;
    let clientLogoUrl: string | null = null;
    let clientFaviconUrl: string | null = null;

    if (isWhiteLabel) {
      try {
        const { data: logoFiles } = await sb.storage.from('logos').list(workspace_id, { limit: 30 });
        const appLogo = logoFiles?.find((f: any) => f.name.startsWith('app.'));
        if (appLogo) {
          logoUrl = `${SUPABASE_URL}/storage/v1/object/public/logos/${workspace_id}/${appLogo.name}`;
        }
        // Check for client-specific favicon
        const clientFavicon = logoFiles?.find((f: any) => f.name.startsWith(`client-${client_id}-favicon.`));
        if (clientFavicon) {
          clientFaviconUrl = `${SUPABASE_URL}/storage/v1/object/public/logos/${workspace_id}/${clientFavicon.name}`;
        }
        // Check for client-specific full logo
        const clientLogo = logoFiles?.find((f: any) => f.name.startsWith(`client-${client_id}.`) && !f.name.includes('-favicon'));
        if (clientLogo) {
          clientLogoUrl = `${SUPABASE_URL}/storage/v1/object/public/logos/${workspace_id}/${clientLogo.name}`;
        }
      } catch {
        // Non-fatal
      }
    }

    // 4. Build response
    const showCosts = client.show_portal_costs !== false;

    // Filter sensitive fields from sessions if costs hidden
    const sessions = (sessionsRes.data || []).map((s: any) => ({
      id: s.id,
      date: s.date,
      duration: s.duration,
      task: s.task,
      work_tags: s.work_tags,
      billable: s.billable,
      project_id: s.project_id,
      ...(showCosts ? { revenue: s.revenue } : {}),
    }));

    const projects = (projectsRes.data || []).map((p: any) => ({
      id: p.id,
      name: p.name,
      status: p.status,
      description: p.description,
      start_date: p.start_date,
      end_date: p.end_date,
      hours: p.hours,
      estimated_hours: p.estimated_hours,
      ...(showCosts ? { revenue: p.revenue, total_value: p.total_value, budget_amount: p.budget_amount, budget_type: p.budget_type } : {}),
    }));

    const invoices = showCosts
      ? (invoicesRes.data || []).map((inv: any) => ({
          id: inv.id,
          number: inv.number,
          status: inv.status,
          issued_date: inv.issued_date,
          due_date: inv.due_date,
          paid_date: inv.paid_date,
          total: inv.total,
          currency: inv.currency,
        }))
      : [];

    // Load checklist items for all checklists
    const checklistRows = checklistsRes.data || [];
    let checklists: any[] = [];
    if (checklistRows.length > 0) {
      const checklistIds = checklistRows.map((c: any) => c.id);
      const { data: itemsData } = await sb
        .from('checklist_items')
        .select('*')
        .in('checklist_id', checklistIds)
        .order('sort_order', { ascending: true });

      const itemsByChecklist: Record<string, any[]> = {};
      (itemsData || []).forEach((item: any) => {
        if (!itemsByChecklist[item.checklist_id]) itemsByChecklist[item.checklist_id] = [];
        itemsByChecklist[item.checklist_id].push({
          id: item.id,
          text: item.text,
          completed: item.completed,
          sort_order: item.sort_order,
          added_by: item.added_by,
        });
      });

      checklists = checklistRows.map((c: any) => ({
        id: c.id,
        title: c.title,
        project_id: c.project_id,
        items: itemsByChecklist[c.id] || [],
      }));
    }

    const portalData = {
      client: {
        name: client.name,
        model: client.model,
        status: client.status,
        portalGreeting: client.portal_greeting || null,
        ...(showCosts ? {
          rate: client.rate,
          retainerTotal: client.retainer_total,
          retainerRemaining: client.retainer_remaining,
          lifetimeRevenue: client.lifetime_revenue,
          monthlyEarnings: client.monthly_earnings,
        } : {
          retainerTotal: client.retainer_total,
          retainerRemaining: client.retainer_remaining,
        }),
        hoursLogged: client.hours_logged,
      },
      projects,
      sessions,
      invoices,
      checklists,
      showCosts,
      branding: {
        isWhiteLabel,
        workspaceName: isWhiteLabel ? (workspace?.name || null) : null,
        brandColor: isWhiteLabel ? (wsSettings?.brandColor || null) : null,
        logoUrl: isWhiteLabel ? logoUrl : null,
        clientLogoUrl: isWhiteLabel ? clientLogoUrl : null,
        clientFaviconUrl: isWhiteLabel ? clientFaviconUrl : null,
      },
    };

    return new Response(JSON.stringify({ data: portalData }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[portal-view]', err);
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
