CREATE POLICY "Admins can update pending invites"
  ON public.pending_invites
  FOR UPDATE
  TO authenticated
  USING (
    workspace_id IN (SELECT get_user_workspace_ids())
    AND is_workspace_admin_or_owner(workspace_id)
  );