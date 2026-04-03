
-- Fix the security definer view warning by explicitly setting SECURITY INVOKER
DROP VIEW IF EXISTS public.workspaces_safe;

CREATE VIEW public.workspaces_safe
WITH (security_invoker = true)
AS
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
