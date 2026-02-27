
-- Create a security definer function to check workspace role
CREATE OR REPLACE FUNCTION public.has_workspace_role(_workspace_id uuid, _role text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.workspace_members
    WHERE workspace_id = _workspace_id
      AND user_id = auth.uid()
      AND status = 'active'
      AND role = _role
  )
$$;

-- Helper: check if user is Owner or Admin in a workspace
CREATE OR REPLACE FUNCTION public.is_workspace_admin_or_owner(_workspace_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.workspace_members
    WHERE workspace_id = _workspace_id
      AND user_id = auth.uid()
      AND status = 'active'
      AND role IN ('Owner', 'Admin')
  )
$$;

-- Tighten workspace_members: only Owner/Admin can update/delete
DROP POLICY IF EXISTS "Workspace members can delete" ON public.workspace_members;
DROP POLICY IF EXISTS "Workspace members can update" ON public.workspace_members;

CREATE POLICY "Admins can delete workspace members"
ON public.workspace_members
FOR DELETE
USING (
  workspace_id IN (SELECT get_user_workspace_ids())
  AND is_workspace_admin_or_owner(workspace_id)
);

CREATE POLICY "Admins can update workspace members"
ON public.workspace_members
FOR UPDATE
USING (
  workspace_id IN (SELECT get_user_workspace_ids())
  AND is_workspace_admin_or_owner(workspace_id)
);

-- Tighten workspace_settings: only Owner/Admin can write
DROP POLICY IF EXISTS "Workspace access for settings" ON public.workspace_settings;

CREATE POLICY "Workspace settings read"
ON public.workspace_settings
FOR SELECT
USING (workspace_id IN (SELECT get_user_workspace_ids()));

CREATE POLICY "Admins can write workspace settings"
ON public.workspace_settings
FOR INSERT
WITH CHECK (
  workspace_id IN (SELECT get_user_workspace_ids())
  AND is_workspace_admin_or_owner(workspace_id)
);

CREATE POLICY "Admins can update workspace settings"
ON public.workspace_settings
FOR UPDATE
USING (
  workspace_id IN (SELECT get_user_workspace_ids())
  AND is_workspace_admin_or_owner(workspace_id)
);

CREATE POLICY "Admins can delete workspace settings"
ON public.workspace_settings
FOR DELETE
USING (
  workspace_id IN (SELECT get_user_workspace_ids())
  AND is_workspace_admin_or_owner(workspace_id)
);

-- Tighten pending_invites: only Owner/Admin can insert/update/delete
DROP POLICY IF EXISTS "Workspace access for pending invites" ON public.pending_invites;

CREATE POLICY "Workspace read pending invites"
ON public.pending_invites
FOR SELECT
USING (workspace_id IN (SELECT get_user_workspace_ids()));

CREATE POLICY "Admins can manage pending invites"
ON public.pending_invites
FOR INSERT
WITH CHECK (
  workspace_id IN (SELECT get_user_workspace_ids())
  AND is_workspace_admin_or_owner(workspace_id)
);

CREATE POLICY "Admins can delete pending invites"
ON public.pending_invites
FOR DELETE
USING (
  workspace_id IN (SELECT get_user_workspace_ids())
  AND is_workspace_admin_or_owner(workspace_id)
);
