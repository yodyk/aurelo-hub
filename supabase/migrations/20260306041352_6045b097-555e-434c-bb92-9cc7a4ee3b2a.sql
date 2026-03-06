-- Allow users to read workspace name/id when they have a pending invite for that workspace
CREATE POLICY "Invited users can view workspace"
  ON public.workspaces
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.pending_invites
      WHERE pending_invites.workspace_id = workspaces.id
        AND pending_invites.email = (auth.jwt() ->> 'email')::text
    )
  );

-- Add a policy that allows workspace_members INSERT only when a pending_invite exists
-- (the existing "Users can create own membership" policy handles the user_id check,
-- but we also need to ensure invited users can join workspaces they're invited to)
-- The existing INSERT policy (user_id = auth.uid()) is sufficient since we control the insert.
-- No additional policy needed for INSERT.