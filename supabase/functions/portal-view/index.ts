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
      notesRes,
      portalUpdateRes,
      milestonesRes,
      resourcesRes,
      approvalsRes,
      questionsRes,
    ] = await Promise.all([
      sb.from('clients').select('*').eq('id', client_id).single(),
      sb.from('projects').select('*').eq('client_id', client_id).eq('workspace_id', workspace_id).order('created_at', { ascending: false }),
      sb.from('sessions').select('*').eq('client_id', client_id).eq('workspace_id', workspace_id).order('date', { ascending: false }).limit(100),
      sb.from('invoices').select('*').eq('client_id', client_id).eq('workspace_id', workspace_id).order('created_at', { ascending: false }),
      sb.from('workspaces').select('name, plan_id, owner_email').eq('id', workspace_id).single(),
      sb.from('workspace_settings').select('data').eq('workspace_id', workspace_id).eq('section', 'workspace').maybeSingle(),
      // P3: only return checklists explicitly shared with the client
      sb.from('checklists').select('*').eq('client_id', client_id).eq('workspace_id', workspace_id).eq('shared_with_client', true).order('created_at', { ascending: true }),
      // P3: shared notes — for activity feed only (note.shared events)
      sb.from('notes').select('*').eq('client_id', client_id).eq('workspace_id', workspace_id).eq('shared_with_client', true).order('updated_at', { ascending: false }).limit(20),
      // P3: latest weekly update
      sb.from('portal_updates').select('*').eq('client_id', client_id).eq('workspace_id', workspace_id).order('posted_at', { ascending: false }).limit(1).maybeSingle(),
      // P3: all milestones for this client's projects (filtered by project_id below)
      sb.from('project_milestones').select('*').eq('workspace_id', workspace_id).order('sort_order', { ascending: true }),
      // P4: shared resources (link-first deliverables)
      sb.from('shared_resources').select('*').eq('client_id', client_id).eq('workspace_id', workspace_id).order('sort_order', { ascending: true }).order('created_at', { ascending: false }),
      // P4: latest approval decisions
      sb.from('resource_approvals').select('*').eq('client_id', client_id).eq('workspace_id', workspace_id).order('decided_at', { ascending: false }),
      // P5: portal Q&A
      sb.from('portal_questions').select('*').eq('client_id', client_id).eq('workspace_id', workspace_id).order('asked_at', { ascending: false }).limit(50),
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
      notes: s.notes,
      work_tags: s.work_tags,
      billable: s.billable,
      project_id: s.project_id,
      ...(showCosts ? { revenue: s.revenue } : {}),
    }));

    // P3: bucket milestones by project_id and pick the next one per project
    const milestonesByProject: Record<string, any[]> = {};
    for (const m of (milestonesRes.data || [])) {
      const pid = m.project_id as string;
      if (!milestonesByProject[pid]) milestonesByProject[pid] = [];
      milestonesByProject[pid].push(m);
    }
    const pickNextMilestone = (pid: string) => {
      const list = milestonesByProject[pid] || [];
      // Prefer in_progress, then upcoming. Skip complete. Within same status, lowest sort_order wins.
      const open = list
        .filter((m: any) => m.status !== 'complete')
        .sort((a: any, b: any) => {
          const rank = (s: string) => (s === 'in_progress' ? 0 : s === 'upcoming' ? 1 : 2);
          const r = rank(a.status) - rank(b.status);
          if (r !== 0) return r;
          return (a.sort_order ?? 0) - (b.sort_order ?? 0);
        });
      return open[0]
        ? { title: open[0].title, status: open[0].status, due_date: open[0].due_date ?? null }
        : null;
    };

    const projects = (projectsRes.data || []).map((p: any) => ({
      id: p.id,
      name: p.name,
      status: p.status,
      description: p.description,
      start_date: p.start_date,
      end_date: p.end_date,
      hours: p.hours,
      estimated_hours: p.estimated_hours,
      next_milestone: pickNextMilestone(p.id),
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
          description: item.description ?? null,
          status: item.status || (item.completed ? 'complete' : 'to_do'),
          completed: item.completed,
          completed_at: item.completed_at ?? null,
          work_tags: item.work_tags || [],
          due_date: item.due_date ?? null,
          estimated_hours: item.estimated_hours ?? null,
          priority: item.priority ?? null,
          sort_order: item.sort_order,
          added_by: item.added_by,
          assigned_to_client: item.assigned_to_client === true,
        });
      });

      checklists = checklistRows.map((c: any) => ({
        id: c.id,
        title: c.title,
        project_id: c.project_id,
        items: itemsByChecklist[c.id] || [],
      }));
    }

    // Derived: semantic activity feed (relationship events, not timer events)
    type ActivityEvent = { id: string; type: string; title: string; at: string; href?: string };
    const activity: ActivityEvent[] = [];
    for (const inv of (invoicesRes.data || [])) {
      if (inv.issued_date || inv.created_at) {
        activity.push({
          id: `inv-sent-${inv.id}`,
          type: 'invoice.sent',
          title: `Invoice ${inv.number} sent`,
          at: inv.issued_date || inv.created_at,
        });
      }
      if (inv.paid_date) {
        activity.push({
          id: `inv-paid-${inv.id}`,
          type: 'invoice.paid',
          title: `Invoice ${inv.number} paid`,
          at: inv.paid_date,
        });
      }
    }
    for (const cl of checklists) {
      for (const it of cl.items as any[]) {
        if (it.status === 'complete' && it.completed_at) {
          activity.push({
            id: `task-${it.id}`,
            type: 'task.completed',
            title: `Task completed: ${it.text}`,
            at: it.completed_at,
          });
        }
      }
    }
    // P3: note.shared events (from notes flagged shared_with_client)
    for (const n of (notesRes.data || [])) {
      activity.push({
        id: `note-${n.id}`,
        type: 'note.shared',
        title: n.content ? `Note shared: ${String(n.content).replace(/<[^>]+>/g, '').slice(0, 80)}` : 'Note shared',
        at: n.updated_at || n.created_at,
      });
    }
    // P3: update.posted event for the latest weekly update
    const portalUpdate = portalUpdateRes?.data || null;
    if (portalUpdate) {
      activity.push({
        id: `update-${portalUpdate.id}`,
        type: 'update.posted',
        title: 'Weekly update posted',
        at: portalUpdate.posted_at,
      });
    }
    // P4: latest approval per resource
    const latestApprovalByResource: Record<string, any> = {};
    for (const a of (approvalsRes.data || [])) {
      if (!latestApprovalByResource[a.resource_id]) {
        latestApprovalByResource[a.resource_id] = a;
      }
    }

    // P4: resources payload + activity events
    const resources = (resourcesRes.data || []).map((r: any) => {
      const last = latestApprovalByResource[r.id];
      return {
        id: r.id,
        kind: r.kind,
        provider: r.provider ?? null,
        url: r.url ?? null,
        title: r.title,
        description: r.description ?? null,
        status: r.status,
        needs_approval: r.needs_approval === true,
        project_id: r.project_id ?? null,
        created_at: r.created_at,
        last_decision: last
          ? { decision: last.decision, comment: last.comment ?? null, at: last.decided_at }
          : null,
      };
    });
    for (const r of (resourcesRes.data || [])) {
      activity.push({
        id: `res-added-${r.id}`,
        type: 'resource.added',
        title: `Resource shared: ${r.title}`,
        at: r.created_at,
      });
    }
    for (const a of (approvalsRes.data || [])) {
      const r = (resourcesRes.data || []).find((x: any) => x.id === a.resource_id);
      const label = r ? r.title : 'resource';
      const t =
        a.decision === 'approved' ? `Approved: ${label}` :
        a.decision === 'changes_requested' ? `Changes requested: ${label}` :
        `Rejected: ${label}`;
      activity.push({
        id: `res-decision-${a.id}`,
        type: a.decision === 'approved' ? 'resource.approved' : a.decision === 'changes_requested' ? 'resource.changes_requested' : 'resource.rejected',
        title: t,
        at: a.decided_at,
      });
    }
    // P5: portal questions — activity events
    const questions = (questionsRes.data || []);
    for (const q of questions) {
      activity.push({
        id: `q-asked-${q.id}`,
        type: q.asked_by === 'owner' ? 'question.asked_by_owner' : 'question.asked_by_client',
        title: q.asked_by === 'owner'
          ? `Question for you: ${String(q.question).slice(0, 80)}`
          : `You asked: ${String(q.question).slice(0, 80)}`,
        at: q.asked_at,
      });
      if (q.answered_at) {
        activity.push({
          id: `q-ans-${q.id}`,
          type: 'question.answered',
          title: q.answered_by === 'client'
            ? `You answered: ${String(q.question).slice(0, 60)}`
            : `Answered: ${String(q.question).slice(0, 60)}`,
          at: q.answered_at,
        });
      }
    }
    activity.sort((a, b) => (a.at < b.at ? 1 : -1));
    const activityCappedFinal = activity.slice(0, 20);

    // Derived: waiting-on-you
    type WaitingItem = { id: string; kind: string; title: string; href?: string; amount?: number; currency?: string; due_date?: string | null };
    const waitingOnYou: WaitingItem[] = [];
    if (showCosts) {
      for (const inv of invoices) {
        if (['sent', 'issued', 'overdue'].includes(String(inv.status).toLowerCase())) {
          waitingOnYou.push({
            id: `pay-${inv.id}`,
            kind: 'invoice.pay',
            title: `Pay invoice ${inv.number}`,
            amount: inv.total,
            currency: inv.currency,
            due_date: inv.due_date ?? null,
          });
        }
      }
    }
    for (const cl of checklists) {
      for (const it of cl.items as any[]) {
        if (it.added_by === 'owner' && it.status !== 'complete' && (it.assigned_to_client === true)) {
          waitingOnYou.push({
            id: `task-${it.id}`,
            kind: 'task.action',
            title: it.text,
            due_date: it.due_date ?? null,
          });
        }
      }
    }
    // P4: resources awaiting approval
    for (const r of (resourcesRes.data || [])) {
      if (r.needs_approval === true) {
        waitingOnYou.push({
          id: `approve-${r.id}`,
          kind: 'resource.approve',
          title: `Review: ${r.title}`,
        });
      }
    }

    // P5: open owner→client questions belong in waiting-on-you
    for (const q of questions) {
      if (q.asked_by === 'owner' && q.status === 'open') {
        waitingOnYou.push({
          id: `question-${q.id}`,
          kind: 'question.answer',
          title: String(q.question).slice(0, 140),
        });
      }
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
      resources,
      questions: questions.map((q: any) => ({
        id: q.id,
        askedBy: q.asked_by,
        question: q.question,
        answer: q.answer ?? null,
        status: q.status,
        askedAt: q.asked_at,
        answeredAt: q.answered_at ?? null,
        answeredBy: q.answered_by ?? null,
      })),
      activity: activityCappedFinal,
      waitingOnYou,
      portalUpdate: portalUpdate
        ? {
            id: portalUpdate.id,
            thisWeek: portalUpdate.this_week ?? null,
            nextWeek: portalUpdate.next_week ?? null,
            waitingOnYou: portalUpdate.waiting_on_you ?? null,
            postedAt: portalUpdate.posted_at,
          }
        : null,
      workspaceOwner: {
        name: workspace?.name || null,
        email: (workspace as any)?.owner_email || null,
      },
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
