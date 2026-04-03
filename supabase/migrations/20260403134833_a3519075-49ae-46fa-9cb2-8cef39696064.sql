
-- Fix 1: Restrict pending_invites SELECT to admins/owners (members don't need to see invite emails)
DROP POLICY IF EXISTS "Workspace read pending invites" ON public.pending_invites;
CREATE POLICY "Admins can read pending invites"
ON public.pending_invites FOR SELECT TO authenticated
USING (
  (workspace_id IN (SELECT get_user_workspace_ids()) AND is_workspace_admin_or_owner(workspace_id))
  OR email = (auth.jwt() ->> 'email')
);

-- Fix 2: Email-assets bucket — restrict uploads to workspace folder paths
DROP POLICY IF EXISTS "Authenticated users can upload email assets" ON storage.objects;
CREATE POLICY "Workspace members can upload email assets"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'email-assets'
  AND (storage.foldername(name))[1]::uuid IN (SELECT get_user_workspace_ids())
);

-- Fix 3: Add UPDATE policy for client-files bucket
CREATE POLICY "Workspace members can update client files"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'client-files'
  AND (storage.foldername(name))[1]::uuid IN (SELECT get_user_workspace_ids())
);
