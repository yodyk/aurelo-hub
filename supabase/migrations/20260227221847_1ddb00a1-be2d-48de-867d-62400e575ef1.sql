
-- Drop existing restrictive policies on workspace_members
DROP POLICY IF EXISTS "Members can view workspace members" ON public.workspace_members;
DROP POLICY IF EXISTS "Users can create own membership" ON public.workspace_members;
DROP POLICY IF EXISTS "Workspace members can delete" ON public.workspace_members;
DROP POLICY IF EXISTS "Workspace members can update" ON public.workspace_members;

-- Recreate as PERMISSIVE policies
CREATE POLICY "Members can view workspace members"
ON public.workspace_members
FOR SELECT
USING (workspace_id IN (SELECT get_user_workspace_ids()));

CREATE POLICY "Users can create own membership"
ON public.workspace_members
FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Workspace members can delete"
ON public.workspace_members
FOR DELETE
USING (workspace_id IN (SELECT get_user_workspace_ids()));

CREATE POLICY "Workspace members can update"
ON public.workspace_members
FOR UPDATE
USING (workspace_id IN (SELECT get_user_workspace_ids()));
