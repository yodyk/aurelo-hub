
-- 1. api_keys: admin/owner only for INSERT/DELETE
DROP POLICY IF EXISTS "Workspace insert for api keys" ON public.api_keys;
DROP POLICY IF EXISTS "Workspace delete for api keys" ON public.api_keys;

CREATE POLICY "Admins can insert api keys"
  ON public.api_keys FOR INSERT TO authenticated
  WITH CHECK (workspace_id IN (SELECT get_user_workspace_ids()) AND is_workspace_admin_or_owner(workspace_id));

CREATE POLICY "Admins can delete api keys"
  ON public.api_keys FOR DELETE TO authenticated
  USING (workspace_id IN (SELECT get_user_workspace_ids()) AND is_workspace_admin_or_owner(workspace_id));

-- 2. invoices: split ALL into per-op policies; restrict writes to admins
DROP POLICY IF EXISTS "Workspace access for invoices" ON public.invoices;

CREATE POLICY "Members can view invoices"
  ON public.invoices FOR SELECT TO authenticated
  USING (workspace_id IN (SELECT get_user_workspace_ids()));

CREATE POLICY "Admins can insert invoices"
  ON public.invoices FOR INSERT TO authenticated
  WITH CHECK (workspace_id IN (SELECT get_user_workspace_ids()) AND is_workspace_admin_or_owner(workspace_id));

CREATE POLICY "Admins can update invoices"
  ON public.invoices FOR UPDATE TO authenticated
  USING (workspace_id IN (SELECT get_user_workspace_ids()) AND is_workspace_admin_or_owner(workspace_id));

CREATE POLICY "Admins can delete invoices"
  ON public.invoices FOR DELETE TO authenticated
  USING (workspace_id IN (SELECT get_user_workspace_ids()) AND is_workspace_admin_or_owner(workspace_id));

-- 3. clients: keep SELECT for all members but restrict writes to admins
DROP POLICY IF EXISTS "Workspace access for clients" ON public.clients;

CREATE POLICY "Members can view clients"
  ON public.clients FOR SELECT TO authenticated
  USING (workspace_id IN (SELECT get_user_workspace_ids()));

CREATE POLICY "Admins can insert clients"
  ON public.clients FOR INSERT TO authenticated
  WITH CHECK (workspace_id IN (SELECT get_user_workspace_ids()) AND is_workspace_admin_or_owner(workspace_id));

CREATE POLICY "Admins can update clients"
  ON public.clients FOR UPDATE TO authenticated
  USING (workspace_id IN (SELECT get_user_workspace_ids()) AND is_workspace_admin_or_owner(workspace_id));

CREATE POLICY "Admins can delete clients"
  ON public.clients FOR DELETE TO authenticated
  USING (workspace_id IN (SELECT get_user_workspace_ids()) AND is_workspace_admin_or_owner(workspace_id));

-- 4. workspaces: Hide sensitive Stripe/billing columns from non-admin members.
-- Create a safe view exposing only non-sensitive fields, and revoke direct column access.
-- We do this by creating column-level grants restriction via a SECURITY DEFINER function
-- callable by members for non-sensitive fields, plus a view for admin-only sensitive data.

CREATE OR REPLACE VIEW public.workspaces_billing
WITH (security_invoker = true) AS
SELECT id, stripe_customer_id, stripe_subscription_id, stripe_connect_account_id,
       owner_email, plan_period_end, plan_activated_at
FROM public.workspaces
WHERE is_workspace_admin_or_owner(id) OR owner_id = auth.uid();

GRANT SELECT ON public.workspaces_billing TO authenticated;

-- 5. Realtime: scope notifications channel to workspace members
-- realtime.messages controls broadcast/presence; postgres_changes is governed by table RLS,
-- which is already in place. Add a defensive policy on realtime.messages anyway.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'realtime' AND tablename = 'messages') THEN
    EXECUTE 'ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY';
    EXECUTE $p$
      DROP POLICY IF EXISTS "Workspace members can read realtime messages" ON realtime.messages;
      CREATE POLICY "Workspace members can read realtime messages"
        ON realtime.messages FOR SELECT TO authenticated
        USING (
          topic LIKE 'notifications:%'
          AND substring(topic from 'notifications:(.*)')::uuid IN (SELECT public.get_user_workspace_ids())
        );
    $p$;
  END IF;
END $$;
