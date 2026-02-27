
-- Fix: workspaces INSERT policy must be PERMISSIVE, not RESTRICTIVE
DROP POLICY "Authenticated users can create workspace" ON public.workspaces;

CREATE POLICY "Authenticated users can create workspace"
ON public.workspaces
FOR INSERT
TO authenticated
WITH CHECK (owner_id = auth.uid());

-- Also fix workspace_members INSERT to be permissive
DROP POLICY "Users can create own membership" ON public.workspace_members;

CREATE POLICY "Users can create own membership"
ON public.workspace_members
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Fix invoice_sequences INSERT to be permissive
DROP POLICY "Owner can insert invoice sequence" ON public.invoice_sequences;

CREATE POLICY "Owner can insert invoice sequence"
ON public.invoice_sequences
FOR INSERT
TO authenticated
WITH CHECK (
  workspace_id IN (
    SELECT id FROM public.workspaces WHERE owner_id = auth.uid()
  )
);
