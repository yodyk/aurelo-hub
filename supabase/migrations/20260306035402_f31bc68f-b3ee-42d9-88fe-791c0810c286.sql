
-- Fix: replace the SELECT policy that queries auth.users directly
-- Use auth.jwt() to get the email instead

DROP POLICY IF EXISTS "Users can see their own invites" ON public.pending_invites;

CREATE POLICY "Users can see their own invites"
  ON public.pending_invites
  FOR SELECT
  TO authenticated
  USING (email = (auth.jwt() ->> 'email')::text);
