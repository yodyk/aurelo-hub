
-- Allow workspace owners to always see their own workspace (fixes INSERT+RETURNING)
CREATE POLICY "Owner can view own workspace"
ON public.workspaces
FOR SELECT
TO authenticated
USING (owner_id = auth.uid());
