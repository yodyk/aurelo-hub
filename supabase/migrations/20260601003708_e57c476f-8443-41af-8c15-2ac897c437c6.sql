-- Portal updates (weekly cadence card)
CREATE TABLE public.portal_updates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  client_id uuid NOT NULL,
  this_week text,
  next_week text,
  waiting_on_you text,
  posted_at timestamptz NOT NULL DEFAULT now(),
  posted_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.portal_updates TO authenticated;
GRANT ALL ON public.portal_updates TO service_role;

ALTER TABLE public.portal_updates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view portal updates"
  ON public.portal_updates FOR SELECT TO authenticated
  USING (workspace_id IN (SELECT get_user_workspace_ids()));

CREATE POLICY "Admins can insert portal updates"
  ON public.portal_updates FOR INSERT TO authenticated
  WITH CHECK (workspace_id IN (SELECT get_user_workspace_ids()) AND is_workspace_admin_or_owner(workspace_id));

CREATE POLICY "Admins can update portal updates"
  ON public.portal_updates FOR UPDATE TO authenticated
  USING (workspace_id IN (SELECT get_user_workspace_ids()) AND is_workspace_admin_or_owner(workspace_id));

CREATE POLICY "Admins can delete portal updates"
  ON public.portal_updates FOR DELETE TO authenticated
  USING (workspace_id IN (SELECT get_user_workspace_ids()) AND is_workspace_admin_or_owner(workspace_id));

CREATE INDEX idx_portal_updates_client ON public.portal_updates (client_id, posted_at DESC);

CREATE TRIGGER trg_portal_updates_updated_at
  BEFORE UPDATE ON public.portal_updates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Project milestones
CREATE TABLE public.project_milestones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  project_id uuid NOT NULL,
  title text NOT NULL,
  status text NOT NULL DEFAULT 'upcoming',
  due_date date,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_milestones TO authenticated;
GRANT ALL ON public.project_milestones TO service_role;

ALTER TABLE public.project_milestones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view milestones"
  ON public.project_milestones FOR SELECT TO authenticated
  USING (workspace_id IN (SELECT get_user_workspace_ids()));

CREATE POLICY "Admins can insert milestones"
  ON public.project_milestones FOR INSERT TO authenticated
  WITH CHECK (workspace_id IN (SELECT get_user_workspace_ids()) AND is_workspace_admin_or_owner(workspace_id));

CREATE POLICY "Admins can update milestones"
  ON public.project_milestones FOR UPDATE TO authenticated
  USING (workspace_id IN (SELECT get_user_workspace_ids()) AND is_workspace_admin_or_owner(workspace_id));

CREATE POLICY "Admins can delete milestones"
  ON public.project_milestones FOR DELETE TO authenticated
  USING (workspace_id IN (SELECT get_user_workspace_ids()) AND is_workspace_admin_or_owner(workspace_id));

CREATE INDEX idx_project_milestones_project ON public.project_milestones (project_id, sort_order);

CREATE TRIGGER trg_project_milestones_updated_at
  BEFORE UPDATE ON public.project_milestones
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Share flags
ALTER TABLE public.checklists
  ADD COLUMN IF NOT EXISTS shared_with_client boolean NOT NULL DEFAULT false;

ALTER TABLE public.checklist_items
  ADD COLUMN IF NOT EXISTS assigned_to_client boolean NOT NULL DEFAULT false;

ALTER TABLE public.notes
  ADD COLUMN IF NOT EXISTS shared_with_client boolean NOT NULL DEFAULT false;