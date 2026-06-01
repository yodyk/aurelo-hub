
CREATE TABLE public.shared_resources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  client_id uuid NOT NULL,
  project_id uuid,
  kind text NOT NULL DEFAULT 'link',
  provider text,
  url text,
  file_path text,
  title text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'shared',
  needs_approval boolean NOT NULL DEFAULT false,
  added_by uuid,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.shared_resources TO authenticated;
GRANT ALL ON public.shared_resources TO service_role;

ALTER TABLE public.shared_resources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view shared resources"
ON public.shared_resources FOR SELECT TO authenticated
USING (workspace_id IN (SELECT get_user_workspace_ids()));

CREATE POLICY "Admins can insert shared resources"
ON public.shared_resources FOR INSERT TO authenticated
WITH CHECK (workspace_id IN (SELECT get_user_workspace_ids()) AND is_workspace_admin_or_owner(workspace_id));

CREATE POLICY "Admins can update shared resources"
ON public.shared_resources FOR UPDATE TO authenticated
USING (workspace_id IN (SELECT get_user_workspace_ids()) AND is_workspace_admin_or_owner(workspace_id));

CREATE POLICY "Admins can delete shared resources"
ON public.shared_resources FOR DELETE TO authenticated
USING (workspace_id IN (SELECT get_user_workspace_ids()) AND is_workspace_admin_or_owner(workspace_id));

CREATE TRIGGER shared_resources_updated_at
BEFORE UPDATE ON public.shared_resources
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_shared_resources_client ON public.shared_resources(workspace_id, client_id);

CREATE TABLE public.resource_approvals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  client_id uuid NOT NULL,
  resource_id uuid NOT NULL,
  decision text NOT NULL,
  comment text,
  decided_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.resource_approvals TO authenticated;
GRANT ALL ON public.resource_approvals TO service_role;

ALTER TABLE public.resource_approvals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view resource approvals"
ON public.resource_approvals FOR SELECT TO authenticated
USING (workspace_id IN (SELECT get_user_workspace_ids()));

CREATE POLICY "Admins can insert resource approvals"
ON public.resource_approvals FOR INSERT TO authenticated
WITH CHECK (workspace_id IN (SELECT get_user_workspace_ids()) AND is_workspace_admin_or_owner(workspace_id));

CREATE POLICY "Admins can update resource approvals"
ON public.resource_approvals FOR UPDATE TO authenticated
USING (workspace_id IN (SELECT get_user_workspace_ids()) AND is_workspace_admin_or_owner(workspace_id));

CREATE POLICY "Admins can delete resource approvals"
ON public.resource_approvals FOR DELETE TO authenticated
USING (workspace_id IN (SELECT get_user_workspace_ids()) AND is_workspace_admin_or_owner(workspace_id));

CREATE INDEX idx_resource_approvals_resource ON public.resource_approvals(resource_id);
