
-- 1. Workspaces: restrict column-level SELECT for sensitive fields
REVOKE SELECT ON public.workspaces FROM authenticated, anon;
GRANT SELECT (id, name, owner_id, created_at, plan_id, plan_activated_at, plan_period_end, is_trial, trial_end, is_approved)
  ON public.workspaces TO authenticated;

-- Owners still need full access to their own row (RLS allows it; grants must too)
GRANT SELECT (stripe_customer_id, stripe_subscription_id, stripe_connect_account_id, owner_email)
  ON public.workspaces TO service_role;

-- 2. Notifications: tighten SELECT — only own rows
DROP POLICY IF EXISTS "Users can read own notifications" ON public.notifications;
CREATE POLICY "Users can read own notifications" ON public.notifications
  FOR SELECT
  USING (
    workspace_id IN (SELECT public.get_user_workspace_ids())
    AND user_id = auth.uid()
  );

-- 3. Notifications: only admins may create broadcast (user_id IS NULL) rows
DROP POLICY IF EXISTS "Members can create scoped notifications" ON public.notifications;
CREATE POLICY "Members can create scoped notifications" ON public.notifications
  FOR INSERT
  WITH CHECK (
    workspace_id IN (SELECT public.get_user_workspace_ids())
    AND (
      user_id = auth.uid()
      OR (user_id IS NULL AND public.is_workspace_admin_or_owner(workspace_id))
    )
  );
