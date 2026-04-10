
CREATE TABLE public.client_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES public.workspace_members(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (client_id, member_id)
);

ALTER TABLE public.client_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view assignments in their workspace"
ON public.client_assignments
FOR SELECT
TO authenticated
USING (workspace_id IN (SELECT public.get_user_workspace_ids()));

CREATE POLICY "Admins/owners can manage assignments"
ON public.client_assignments
FOR INSERT
TO authenticated
WITH CHECK (public.is_workspace_admin_or_owner(workspace_id));

CREATE POLICY "Admins/owners can update assignments"
ON public.client_assignments
FOR UPDATE
TO authenticated
USING (public.is_workspace_admin_or_owner(workspace_id));

CREATE POLICY "Admins/owners can delete assignments"
ON public.client_assignments
FOR DELETE
TO authenticated
USING (public.is_workspace_admin_or_owner(workspace_id));

CREATE INDEX idx_client_assignments_client ON public.client_assignments(client_id);
CREATE INDEX idx_client_assignments_workspace ON public.client_assignments(workspace_id);
