
-- Fix 1: Webhook signing secrets — restrict SELECT to admins/owners
DROP POLICY IF EXISTS "Workspace members can view webhooks" ON public.webhooks;
CREATE POLICY "Admins can view webhooks"
ON public.webhooks FOR SELECT TO authenticated
USING (
  workspace_id IN (SELECT get_user_workspace_ids())
  AND is_workspace_admin_or_owner(workspace_id)
);

-- Fix 2: Portal tokens — restrict to admins/owners only
DROP POLICY IF EXISTS "Workspace access for portal tokens" ON public.portal_tokens;
CREATE POLICY "Admins can manage portal tokens"
ON public.portal_tokens FOR ALL TO authenticated
USING (
  workspace_id IN (SELECT get_user_workspace_ids())
  AND is_workspace_admin_or_owner(workspace_id)
)
WITH CHECK (
  workspace_id IN (SELECT get_user_workspace_ids())
  AND is_workspace_admin_or_owner(workspace_id)
);

-- Fix 3: Email events — restrict to admins/owners
DROP POLICY IF EXISTS "Workspace members can read email events" ON public.email_events;
CREATE POLICY "Admins can read email events"
ON public.email_events FOR SELECT TO authenticated
USING (
  workspace_id IN (SELECT get_user_workspace_ids())
  AND is_workspace_admin_or_owner(workspace_id)
);

-- Fix 4: Create safe workspace view hiding sensitive Stripe fields from non-admins
CREATE OR REPLACE VIEW public.workspaces_safe AS
SELECT
  id, name, owner_id, plan_id, plan_activated_at, plan_period_end,
  is_trial, trial_end, is_approved, created_at,
  CASE WHEN owner_id = auth.uid() OR is_workspace_admin_or_owner(id)
    THEN owner_email ELSE NULL END AS owner_email,
  CASE WHEN owner_id = auth.uid() OR is_workspace_admin_or_owner(id)
    THEN stripe_customer_id ELSE NULL END AS stripe_customer_id,
  CASE WHEN owner_id = auth.uid() OR is_workspace_admin_or_owner(id)
    THEN stripe_subscription_id ELSE NULL END AS stripe_subscription_id,
  CASE WHEN owner_id = auth.uid() OR is_workspace_admin_or_owner(id)
    THEN stripe_connect_account_id ELSE NULL END AS stripe_connect_account_id
FROM public.workspaces;
