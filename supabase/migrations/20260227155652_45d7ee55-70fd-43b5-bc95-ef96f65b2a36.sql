
-- Fix chicken-and-egg: allow user to insert their own membership row
DROP POLICY "Workspace members can insert" ON public.workspace_members;

CREATE POLICY "Users can create own membership" 
ON public.workspace_members 
FOR INSERT
WITH CHECK (user_id = auth.uid());

-- Fix invoice_sequences: allow insert when user owns the workspace
DROP POLICY "Workspace access for invoice sequences" ON public.invoice_sequences;

CREATE POLICY "Workspace select for invoice sequences"
ON public.invoice_sequences
FOR SELECT
USING (workspace_id IN (SELECT get_user_workspace_ids()));

CREATE POLICY "Workspace update for invoice sequences"
ON public.invoice_sequences
FOR UPDATE
USING (workspace_id IN (SELECT get_user_workspace_ids()));

CREATE POLICY "Workspace delete for invoice sequences"
ON public.invoice_sequences
FOR DELETE
USING (workspace_id IN (SELECT get_user_workspace_ids()));

CREATE POLICY "Owner can insert invoice sequence"
ON public.invoice_sequences
FOR INSERT
WITH CHECK (
  workspace_id IN (
    SELECT id FROM public.workspaces WHERE owner_id = auth.uid()
  )
);
