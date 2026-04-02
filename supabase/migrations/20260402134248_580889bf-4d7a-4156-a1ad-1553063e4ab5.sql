-- Fix 1: Remove the overly permissive "Public portal access" policy
-- The portal-view edge function uses service_role key, so no public RLS policy is needed
DROP POLICY IF EXISTS "Public portal access" ON public.portal_tokens;

-- Fix 2: Tighten workspace_members INSERT policy to require a pending invite
DROP POLICY IF EXISTS "Users can create own membership" ON public.workspace_members;

CREATE POLICY "Users can create own membership via invite"
ON public.workspace_members
FOR INSERT
TO public
WITH CHECK (
  user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.pending_invites
    WHERE pending_invites.workspace_id = workspace_members.workspace_id
      AND pending_invites.email = (auth.jwt() ->> 'email')
  )
);