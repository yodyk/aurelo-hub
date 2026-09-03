-- ── Expense categories ─────────────────────────────────────────────
CREATE TABLE public.expense_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  is_seed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, name)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.expense_categories TO authenticated;
GRANT ALL ON public.expense_categories TO service_role;
ALTER TABLE public.expense_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "expense_categories_select" ON public.expense_categories FOR SELECT TO authenticated
  USING (workspace_id IN (SELECT public.get_user_workspace_ids()));
CREATE POLICY "expense_categories_insert" ON public.expense_categories FOR INSERT TO authenticated
  WITH CHECK (workspace_id IN (SELECT public.get_user_workspace_ids()));
CREATE POLICY "expense_categories_update" ON public.expense_categories FOR UPDATE TO authenticated
  USING (workspace_id IN (SELECT public.get_user_workspace_ids()));
CREATE POLICY "expense_categories_delete" ON public.expense_categories FOR DELETE TO authenticated
  USING (workspace_id IN (SELECT public.get_user_workspace_ids()));
CREATE TRIGGER expense_categories_updated_at BEFORE UPDATE ON public.expense_categories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ── Income entries ─────────────────────────────────────────────────
CREATE TABLE public.income_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  source_type text NOT NULL DEFAULT 'manual',
  source_id text,
  source_key text NOT NULL,
  client_id uuid,
  payer_name text,
  description text,
  source_amount numeric(14,2) NOT NULL DEFAULT 0,
  override_amount numeric(14,2),
  currency text NOT NULL DEFAULT 'USD',
  status text NOT NULL DEFAULT 'projected',
  earned_date date,
  paid_date date,
  included boolean NOT NULL DEFAULT true,
  source_state text NOT NULL DEFAULT 'active',
  suppressed_by text,
  notes text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT income_entries_source_type_check CHECK (source_type IN ('project','retainer','invoice','payment','manual')),
  CONSTRAINT income_entries_status_check CHECK (status IN ('projected','invoiced','paid','needs_review','excluded')),
  CONSTRAINT income_entries_source_state_check CHECK (source_state IN ('active','archived','missing')),
  UNIQUE (workspace_id, source_key)
);
CREATE INDEX income_entries_ws_earned_idx ON public.income_entries (workspace_id, earned_date);
CREATE INDEX income_entries_ws_paid_idx ON public.income_entries (workspace_id, paid_date);
CREATE INDEX income_entries_ws_client_idx ON public.income_entries (workspace_id, client_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.income_entries TO authenticated;
GRANT ALL ON public.income_entries TO service_role;
ALTER TABLE public.income_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "income_entries_select" ON public.income_entries FOR SELECT TO authenticated
  USING (workspace_id IN (SELECT public.get_user_workspace_ids()));
CREATE POLICY "income_entries_insert" ON public.income_entries FOR INSERT TO authenticated
  WITH CHECK (workspace_id IN (SELECT public.get_user_workspace_ids()));
CREATE POLICY "income_entries_update" ON public.income_entries FOR UPDATE TO authenticated
  USING (workspace_id IN (SELECT public.get_user_workspace_ids()));
CREATE POLICY "income_entries_delete" ON public.income_entries FOR DELETE TO authenticated
  USING (workspace_id IN (SELECT public.get_user_workspace_ids()));
CREATE TRIGGER income_entries_updated_at BEFORE UPDATE ON public.income_entries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ── Expenses (series definitions) ──────────────────────────────────
CREATE TABLE public.expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name text NOT NULL,
  vendor text,
  category_id uuid REFERENCES public.expense_categories(id) ON DELETE SET NULL,
  recurrence text NOT NULL DEFAULT 'one_time',
  interval_days integer,
  amount_behavior text NOT NULL DEFAULT 'fixed',
  base_amount numeric(14,2),
  business_use_pct numeric(5,2) NOT NULL DEFAULT 100,
  inclusion text NOT NULL DEFAULT 'included',
  currency text NOT NULL DEFAULT 'USD',
  start_date date,
  end_date date,
  active boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT expenses_recurrence_check CHECK (recurrence IN ('one_time','weekly','monthly','quarterly','yearly','custom')),
  CONSTRAINT expenses_behavior_check CHECK (amount_behavior IN ('fixed','variable','base_plus')),
  CONSTRAINT expenses_inclusion_check CHECK (inclusion IN ('included','excluded','needs_review')),
  CONSTRAINT expenses_business_use_check CHECK (business_use_pct >= 0 AND business_use_pct <= 100)
);
CREATE INDEX expenses_ws_idx ON public.expenses (workspace_id, active);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.expenses TO authenticated;
GRANT ALL ON public.expenses TO service_role;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "expenses_select" ON public.expenses FOR SELECT TO authenticated
  USING (workspace_id IN (SELECT public.get_user_workspace_ids()));
CREATE POLICY "expenses_insert" ON public.expenses FOR INSERT TO authenticated
  WITH CHECK (workspace_id IN (SELECT public.get_user_workspace_ids()));
CREATE POLICY "expenses_update" ON public.expenses FOR UPDATE TO authenticated
  USING (workspace_id IN (SELECT public.get_user_workspace_ids()));
CREATE POLICY "expenses_delete" ON public.expenses FOR DELETE TO authenticated
  USING (workspace_id IN (SELECT public.get_user_workspace_ids()));
CREATE TRIGGER expenses_updated_at BEFORE UPDATE ON public.expenses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ── Expense instances ──────────────────────────────────────────────
CREATE TABLE public.expense_instances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  expense_id uuid NOT NULL REFERENCES public.expenses(id) ON DELETE CASCADE,
  occurrence_key text NOT NULL,
  incurred_date date NOT NULL,
  paid_date date,
  status text NOT NULL DEFAULT 'scheduled',
  base_amount numeric(14,2),
  business_use_pct numeric(5,2),
  currency text NOT NULL DEFAULT 'USD',
  notes text,
  generated boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT expense_instances_status_check CHECK (status IN ('scheduled','needs_amount','confirmed','ignored')),
  CONSTRAINT expense_instances_bu_check CHECK (business_use_pct IS NULL OR (business_use_pct >= 0 AND business_use_pct <= 100)),
  UNIQUE (expense_id, occurrence_key)
);
CREATE INDEX expense_instances_ws_date_idx ON public.expense_instances (workspace_id, incurred_date);
CREATE INDEX expense_instances_ws_paid_idx ON public.expense_instances (workspace_id, paid_date);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.expense_instances TO authenticated;
GRANT ALL ON public.expense_instances TO service_role;
ALTER TABLE public.expense_instances ENABLE ROW LEVEL SECURITY;
CREATE POLICY "expense_instances_select" ON public.expense_instances FOR SELECT TO authenticated
  USING (workspace_id IN (SELECT public.get_user_workspace_ids()));
CREATE POLICY "expense_instances_insert" ON public.expense_instances FOR INSERT TO authenticated
  WITH CHECK (workspace_id IN (SELECT public.get_user_workspace_ids()));
CREATE POLICY "expense_instances_update" ON public.expense_instances FOR UPDATE TO authenticated
  USING (workspace_id IN (SELECT public.get_user_workspace_ids()));
CREATE POLICY "expense_instances_delete" ON public.expense_instances FOR DELETE TO authenticated
  USING (workspace_id IN (SELECT public.get_user_workspace_ids()));
CREATE TRIGGER expense_instances_updated_at BEFORE UPDATE ON public.expense_instances
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ── Expense instance additions ─────────────────────────────────────
CREATE TABLE public.expense_instance_additions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  instance_id uuid NOT NULL REFERENCES public.expense_instances(id) ON DELETE CASCADE,
  label text NOT NULL DEFAULT '',
  amount numeric(14,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX expense_additions_instance_idx ON public.expense_instance_additions (instance_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.expense_instance_additions TO authenticated;
GRANT ALL ON public.expense_instance_additions TO service_role;
ALTER TABLE public.expense_instance_additions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "expense_additions_select" ON public.expense_instance_additions FOR SELECT TO authenticated
  USING (workspace_id IN (SELECT public.get_user_workspace_ids()));
CREATE POLICY "expense_additions_insert" ON public.expense_instance_additions FOR INSERT TO authenticated
  WITH CHECK (workspace_id IN (SELECT public.get_user_workspace_ids()));
CREATE POLICY "expense_additions_update" ON public.expense_instance_additions FOR UPDATE TO authenticated
  USING (workspace_id IN (SELECT public.get_user_workspace_ids()));
CREATE POLICY "expense_additions_delete" ON public.expense_instance_additions FOR DELETE TO authenticated
  USING (workspace_id IN (SELECT public.get_user_workspace_ids()));
CREATE TRIGGER expense_additions_updated_at BEFORE UPDATE ON public.expense_instance_additions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();