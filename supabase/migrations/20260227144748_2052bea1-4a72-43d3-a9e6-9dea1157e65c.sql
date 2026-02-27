
-- ============================================================
-- AURELO: Complete Database Schema (with fixes)
-- ============================================================

-- ─── 1. WORKSPACES ──────────────────────────────────────────
create table if not exists public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_id uuid not null references auth.users(id),
  owner_email text,
  created_at timestamptz not null default now(),
  plan_id text not null default 'starter' check (plan_id in ('starter', 'pro', 'studio')),
  plan_activated_at timestamptz not null default now(),
  plan_period_end timestamptz,
  stripe_subscription_id text,
  stripe_customer_id text,
  is_trial boolean not null default false,
  trial_end timestamptz
);

-- ─── 2. WORKSPACE MEMBERS ──────────────────────────────────
create table if not exists public.workspace_members (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid references auth.users(id),
  email text not null,
  name text,
  role text not null default 'Member' check (role in ('Owner', 'Admin', 'Member')),
  status text not null default 'pending' check (status in ('active', 'pending', 'removed')),
  invited_at timestamptz default now(),
  joined_at timestamptz,
  unique(workspace_id, email)
);

-- ─── 3. WORKSPACE SETTINGS ─────────────────────────────────
create table if not exists public.workspace_settings (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  section text not null,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  unique(workspace_id, section)
);

-- ─── 4. INVOICE SEQUENCES ──────────────────────────────────
create table if not exists public.invoice_sequences (
  workspace_id uuid primary key references public.workspaces(id) on delete cascade,
  next_number integer not null default 1001
);

-- ─── 5. PENDING INVITES ────────────────────────────────────
create table if not exists public.pending_invites (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  role text not null default 'Member',
  invited_by uuid not null references auth.users(id),
  invited_at timestamptz not null default now(),
  unique(email, workspace_id)
);

-- ─── 6. API KEYS ───────────────────────────────────────────
create table if not exists public.api_keys (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  key text not null unique,
  created_at timestamptz not null default now()
);

-- ─── 7. CLIENTS ────────────────────────────────────────────
create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  slug text not null,
  name text not null,
  status text not null default 'Active' check (status in ('Active', 'Prospect', 'Archived')),
  model text not null default 'Hourly' check (model in ('Hourly', 'Retainer', 'Project')),
  rate numeric(10,2) not null default 0,
  retainer_total numeric(10,2) default 0,
  retainer_remaining numeric(10,2) default 0,
  monthly_earnings numeric(10,2) default 0,
  lifetime_revenue numeric(10,2) default 0,
  hours_logged numeric(10,2) default 0,
  true_hourly_rate numeric(10,2) default 0,
  last_session_date date,
  contact_name text,
  contact_email text,
  website text,
  show_portal_costs boolean not null default true,
  external_links jsonb default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(workspace_id, slug)
);

-- ─── 8. PORTAL TOKENS ─────────────────────────────────────
create table if not exists public.portal_tokens (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  token text not null unique,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ─── 9. PROJECTS (FIX: added 'In Progress' to status check) ───
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  name text not null,
  status text not null default 'In Progress' check (status in ('Active', 'In Progress', 'On Hold', 'Complete', 'Archived')),
  total_value numeric(10,2) default 0,
  estimated_hours numeric(10,2) default 0,
  budget_type text check (budget_type in ('hours', 'dollars')),
  budget_amount numeric(10,2) default 0,
  hours numeric(10,2) default 0,
  revenue numeric(10,2) default 0,
  start_date date,
  end_date date,
  external_links jsonb default '[]'::jsonb,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ─── 10. SESSIONS (time entries) ───────────────────────────
create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  project_id uuid references public.projects(id) on delete set null,
  date date not null,
  task text,
  duration numeric(10,2) not null default 0,
  revenue numeric(10,2) not null default 0,
  billable boolean not null default true,
  work_tags text[] default '{}',
  allocation_type text check (allocation_type in ('project', 'retainer', 'general')),
  timer_start timestamptz,
  timer_end timestamptz,
  created_at timestamptz not null default now()
);

-- ─── 11. NOTES ─────────────────────────────────────────────
create table if not exists public.notes (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  project_id uuid references public.projects(id) on delete set null,
  project_name text,
  content text not null,
  type text not null default 'general' check (type in ('general', 'meeting', 'decision', 'action-item', 'feedback')),
  tags text[] default '{}',
  is_pinned boolean not null default false,
  is_resolved boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ─── 12. INVOICES ──────────────────────────────────────────
create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  project_id uuid references public.projects(id) on delete set null,
  number text not null,
  status text not null default 'draft' check (status in ('draft', 'sent', 'paid', 'overdue', 'voided', 'cancelled')),
  line_items jsonb not null default '[]'::jsonb,
  subtotal numeric(10,2) not null default 0,
  tax_rate numeric(5,4) not null default 0,
  tax_amount numeric(10,2) not null default 0,
  total numeric(10,2) not null default 0,
  currency text not null default 'USD',
  due_date date,
  issued_date date,
  paid_date date,
  notes text,
  payment_terms text,
  from_name text,
  from_email text,
  from_address text,
  stripe_invoice_id text,
  stripe_customer_id text,
  stripe_payment_url text,
  created_from_sessions uuid[] default '{}',
  client_name text,
  client_email text,
  project_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.workspace_settings enable row level security;
alter table public.invoice_sequences enable row level security;
alter table public.pending_invites enable row level security;
alter table public.api_keys enable row level security;
alter table public.clients enable row level security;
alter table public.portal_tokens enable row level security;
alter table public.projects enable row level security;
alter table public.sessions enable row level security;
alter table public.notes enable row level security;
alter table public.invoices enable row level security;

-- Helper function (FIX: added set search_path = public)
create or replace function public.get_user_workspace_ids()
returns setof uuid
language sql
security definer
stable
set search_path = public
as $$
  select workspace_id from public.workspace_members
  where user_id = auth.uid() and status = 'active'
$$;

-- ─── WORKSPACES ────────────────────────────────────────────
create policy "Members can view workspace"
  on public.workspaces for select
  using (id in (select public.get_user_workspace_ids()));

create policy "Owner can update workspace"
  on public.workspaces for update
  using (owner_id = auth.uid());

create policy "Authenticated users can create workspace"
  on public.workspaces for insert
  with check (owner_id = auth.uid());

create policy "Owner can delete workspace"
  on public.workspaces for delete
  using (owner_id = auth.uid());

-- ─── WORKSPACE MEMBERS ────────────────────────────────────
create policy "Members can view workspace members"
  on public.workspace_members for select
  using (workspace_id in (select public.get_user_workspace_ids()));

create policy "Workspace members can insert"
  on public.workspace_members for insert
  with check (workspace_id in (select public.get_user_workspace_ids()));

create policy "Workspace members can update"
  on public.workspace_members for update
  using (workspace_id in (select public.get_user_workspace_ids()));

create policy "Workspace members can delete"
  on public.workspace_members for delete
  using (workspace_id in (select public.get_user_workspace_ids()));

-- ─── CLIENTS ──────────────────────────────────────────────
create policy "Workspace access for clients"
  on public.clients for all
  using (workspace_id in (select public.get_user_workspace_ids()));

-- ─── PROJECTS ─────────────────────────────────────────────
create policy "Workspace access for projects"
  on public.projects for all
  using (workspace_id in (select public.get_user_workspace_ids()));

-- ─── SESSIONS ─────────────────────────────────────────────
create policy "Workspace access for sessions"
  on public.sessions for all
  using (workspace_id in (select public.get_user_workspace_ids()));

-- ─── NOTES ────────────────────────────────────────────────
create policy "Workspace access for notes"
  on public.notes for all
  using (workspace_id in (select public.get_user_workspace_ids()));

-- ─── INVOICES ─────────────────────────────────────────────
create policy "Workspace access for invoices"
  on public.invoices for all
  using (workspace_id in (select public.get_user_workspace_ids()));

-- ─── WORKSPACE SETTINGS ──────────────────────────────────
create policy "Workspace access for settings"
  on public.workspace_settings for all
  using (workspace_id in (select public.get_user_workspace_ids()));

-- ─── INVOICE SEQUENCES ──────────────────────────────────
create policy "Workspace access for invoice sequences"
  on public.invoice_sequences for all
  using (workspace_id in (select public.get_user_workspace_ids()));

-- ─── PORTAL TOKENS ───────────────────────────────────────
create policy "Workspace access for portal tokens"
  on public.portal_tokens for all
  using (workspace_id in (select public.get_user_workspace_ids()));

create policy "Public portal access"
  on public.portal_tokens for select
  using (active = true);

-- ─── PENDING INVITES ─────────────────────────────────────
create policy "Workspace access for pending invites"
  on public.pending_invites for all
  using (workspace_id in (select public.get_user_workspace_ids()));

create policy "Users can see their own invites"
  on public.pending_invites for select
  using (email = (select email from auth.users where id = auth.uid()));

-- ─── API KEYS ────────────────────────────────────────────
-- Deny direct SELECT on api_keys to prevent key exposure
create policy "No direct select on api_keys"
  on public.api_keys for select
  using (false);

create policy "Workspace insert for api keys"
  on public.api_keys for insert
  with check (workspace_id in (select public.get_user_workspace_ids()));

create policy "Workspace delete for api keys"
  on public.api_keys for delete
  using (workspace_id in (select public.get_user_workspace_ids()));

-- View that masks API keys (only shows last 8 chars)
create or replace view public.api_keys_safe
with (security_invoker = on) as
  select id, workspace_id, 
    '••••••••' || right(key, 8) as key_masked,
    created_at
  from public.api_keys;

-- ============================================================
-- INDEXES
-- ============================================================

create index if not exists idx_workspace_members_user on public.workspace_members(user_id);
create index if not exists idx_workspace_members_workspace on public.workspace_members(workspace_id);
create index if not exists idx_clients_workspace on public.clients(workspace_id);
create index if not exists idx_projects_workspace on public.projects(workspace_id);
create index if not exists idx_projects_client on public.projects(client_id);
create index if not exists idx_sessions_workspace on public.sessions(workspace_id);
create index if not exists idx_sessions_client on public.sessions(client_id);
create index if not exists idx_sessions_project on public.sessions(project_id);
create index if not exists idx_sessions_date on public.sessions(date);
create index if not exists idx_notes_workspace on public.notes(workspace_id);
create index if not exists idx_notes_client on public.notes(client_id);
create index if not exists idx_invoices_workspace on public.invoices(workspace_id);
create index if not exists idx_invoices_client on public.invoices(client_id);
create index if not exists idx_portal_tokens_token on public.portal_tokens(token);
create index if not exists idx_pending_invites_email on public.pending_invites(email);
