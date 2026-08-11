-- ============================================================
-- 1) Prevent role escalation when self-inserting membership
-- ============================================================

CREATE OR REPLACE FUNCTION public.invited_role_for_current_user(_workspace_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT pi.role
  FROM public.pending_invites pi
  WHERE pi.workspace_id = _workspace_id
    AND lower(pi.email) = lower(auth.jwt() ->> 'email')
  ORDER BY pi.invited_at DESC
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.is_workspace_owner(_workspace_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.workspaces w
    WHERE w.id = _workspace_id AND w.owner_id = auth.uid()
  )
$$;

REVOKE ALL ON FUNCTION public.invited_role_for_current_user(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_workspace_owner(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.invited_role_for_current_user(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_workspace_owner(uuid) TO authenticated;

DROP POLICY IF EXISTS "Users can create own membership via invite" ON public.workspace_members;

CREATE POLICY "Users can create own membership via invite"
ON public.workspace_members
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND lower(email) = lower(auth.jwt() ->> 'email')
  AND status IN ('active', 'pending')
  AND (
    -- Workspace creator bootstrapping their own Owner membership
    (public.is_workspace_owner(workspace_id) AND role = 'Owner')
    OR
    -- Invited user: role MUST match the role on their pending invite
    (role = public.invited_role_for_current_user(workspace_id))
  )
);

-- ============================================================
-- 2) Hide billing / Stripe identifiers from non-admin members
-- ============================================================

REVOKE SELECT ON public.workspaces FROM authenticated;
REVOKE SELECT ON public.workspaces FROM anon;

GRANT SELECT (
  id,
  name,
  owner_id,
  created_at,
  plan_id,
  plan_activated_at,
  plan_period_end,
  is_trial,
  trial_end,
  is_approved
) ON public.workspaces TO authenticated;

GRANT ALL ON public.workspaces TO service_role;

-- Admin/owner-only accessor for the connected payment account
CREATE OR REPLACE FUNCTION public.get_workspace_stripe_connect_account(_workspace_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT w.stripe_connect_account_id
  FROM public.workspaces w
  WHERE w.id = _workspace_id
    AND public.is_workspace_admin_or_owner(_workspace_id)
$$;

REVOKE ALL ON FUNCTION public.get_workspace_stripe_connect_account(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_workspace_stripe_connect_account(uuid) TO authenticated;