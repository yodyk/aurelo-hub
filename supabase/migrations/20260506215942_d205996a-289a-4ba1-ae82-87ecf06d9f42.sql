
-- ============================================================
-- Tighten writes to admin/owner on shared workspace tables
-- ============================================================

-- PROJECTS
DROP POLICY IF EXISTS "Workspace access for projects" ON public.projects;
CREATE POLICY "Members can view projects" ON public.projects
  FOR SELECT USING (workspace_id IN (SELECT public.get_user_workspace_ids()));
CREATE POLICY "Admins can insert projects" ON public.projects
  FOR INSERT WITH CHECK (workspace_id IN (SELECT public.get_user_workspace_ids()) AND public.is_workspace_admin_or_owner(workspace_id));
CREATE POLICY "Admins can update projects" ON public.projects
  FOR UPDATE USING (workspace_id IN (SELECT public.get_user_workspace_ids()) AND public.is_workspace_admin_or_owner(workspace_id));
CREATE POLICY "Admins can delete projects" ON public.projects
  FOR DELETE USING (workspace_id IN (SELECT public.get_user_workspace_ids()) AND public.is_workspace_admin_or_owner(workspace_id));

-- CHECKLISTS
DROP POLICY IF EXISTS "Workspace access for checklists" ON public.checklists;
CREATE POLICY "Members can view checklists" ON public.checklists
  FOR SELECT USING (workspace_id IN (SELECT public.get_user_workspace_ids()));
CREATE POLICY "Admins can insert checklists" ON public.checklists
  FOR INSERT WITH CHECK (workspace_id IN (SELECT public.get_user_workspace_ids()) AND public.is_workspace_admin_or_owner(workspace_id));
CREATE POLICY "Admins can update checklists" ON public.checklists
  FOR UPDATE USING (workspace_id IN (SELECT public.get_user_workspace_ids()) AND public.is_workspace_admin_or_owner(workspace_id));
CREATE POLICY "Admins can delete checklists" ON public.checklists
  FOR DELETE USING (workspace_id IN (SELECT public.get_user_workspace_ids()) AND public.is_workspace_admin_or_owner(workspace_id));

-- RETAINER HISTORY
DROP POLICY IF EXISTS "Workspace access for retainer history" ON public.retainer_history;
CREATE POLICY "Members can view retainer history" ON public.retainer_history
  FOR SELECT USING (workspace_id IN (SELECT public.get_user_workspace_ids()));
CREATE POLICY "Admins can insert retainer history" ON public.retainer_history
  FOR INSERT WITH CHECK (workspace_id IN (SELECT public.get_user_workspace_ids()) AND public.is_workspace_admin_or_owner(workspace_id));
CREATE POLICY "Admins can update retainer history" ON public.retainer_history
  FOR UPDATE USING (workspace_id IN (SELECT public.get_user_workspace_ids()) AND public.is_workspace_admin_or_owner(workspace_id));
CREATE POLICY "Admins can delete retainer history" ON public.retainer_history
  FOR DELETE USING (workspace_id IN (SELECT public.get_user_workspace_ids()) AND public.is_workspace_admin_or_owner(workspace_id));

-- RECURRING SESSIONS
DROP POLICY IF EXISTS "Workspace access for recurring sessions" ON public.recurring_sessions;
CREATE POLICY "Members can view recurring sessions" ON public.recurring_sessions
  FOR SELECT USING (workspace_id IN (SELECT public.get_user_workspace_ids()));
CREATE POLICY "Admins can insert recurring sessions" ON public.recurring_sessions
  FOR INSERT WITH CHECK (workspace_id IN (SELECT public.get_user_workspace_ids()) AND public.is_workspace_admin_or_owner(workspace_id));
CREATE POLICY "Admins can update recurring sessions" ON public.recurring_sessions
  FOR UPDATE USING (workspace_id IN (SELECT public.get_user_workspace_ids()) AND public.is_workspace_admin_or_owner(workspace_id));
CREATE POLICY "Admins can delete recurring sessions" ON public.recurring_sessions
  FOR DELETE USING (workspace_id IN (SELECT public.get_user_workspace_ids()) AND public.is_workspace_admin_or_owner(workspace_id));

-- SESSIONS — members can log their own; only logger or admin can edit/delete
DROP POLICY IF EXISTS "Workspace access for sessions" ON public.sessions;
CREATE POLICY "Members can view sessions" ON public.sessions
  FOR SELECT USING (workspace_id IN (SELECT public.get_user_workspace_ids()));
CREATE POLICY "Members can insert sessions" ON public.sessions
  FOR INSERT WITH CHECK (workspace_id IN (SELECT public.get_user_workspace_ids()) AND logged_by = auth.uid());
CREATE POLICY "Logger or admin can update sessions" ON public.sessions
  FOR UPDATE USING (workspace_id IN (SELECT public.get_user_workspace_ids()) AND (logged_by = auth.uid() OR public.is_workspace_admin_or_owner(workspace_id)));
CREATE POLICY "Logger or admin can delete sessions" ON public.sessions
  FOR DELETE USING (workspace_id IN (SELECT public.get_user_workspace_ids()) AND (logged_by = auth.uid() OR public.is_workspace_admin_or_owner(workspace_id)));

-- EMAIL QUOTAS — admin only writes
DROP POLICY IF EXISTS "Admins can update email quotas" ON public.email_quotas;
DROP POLICY IF EXISTS "Admins can upsert email quotas" ON public.email_quotas;
CREATE POLICY "Admins can update email quotas" ON public.email_quotas
  FOR UPDATE USING (workspace_id IN (SELECT public.get_user_workspace_ids()) AND public.is_workspace_admin_or_owner(workspace_id));
CREATE POLICY "Admins can upsert email quotas" ON public.email_quotas
  FOR INSERT WITH CHECK (workspace_id IN (SELECT public.get_user_workspace_ids()) AND public.is_workspace_admin_or_owner(workspace_id));

-- INVOICE SEQUENCES — admin only writes
DROP POLICY IF EXISTS "Workspace update for invoice sequences" ON public.invoice_sequences;
DROP POLICY IF EXISTS "Workspace delete for invoice sequences" ON public.invoice_sequences;
DROP POLICY IF EXISTS "Owner can insert invoice sequence" ON public.invoice_sequences;
CREATE POLICY "Admins can insert invoice sequences" ON public.invoice_sequences
  FOR INSERT WITH CHECK (workspace_id IN (SELECT public.get_user_workspace_ids()) AND public.is_workspace_admin_or_owner(workspace_id));
CREATE POLICY "Admins can update invoice sequences" ON public.invoice_sequences
  FOR UPDATE USING (workspace_id IN (SELECT public.get_user_workspace_ids()) AND public.is_workspace_admin_or_owner(workspace_id));
CREATE POLICY "Admins can delete invoice sequences" ON public.invoice_sequences
  FOR DELETE USING (workspace_id IN (SELECT public.get_user_workspace_ids()) AND public.is_workspace_admin_or_owner(workspace_id));

-- NOTIFICATIONS — only allow inserts targeted at self or whole workspace
DROP POLICY IF EXISTS "Workspace members can create notifications" ON public.notifications;
CREATE POLICY "Members can create scoped notifications" ON public.notifications
  FOR INSERT WITH CHECK (
    workspace_id IN (SELECT public.get_user_workspace_ids())
    AND (user_id IS NULL OR user_id = auth.uid())
  );

-- ============================================================
-- Lock sensitive columns on workspaces — force reads via
-- workspaces_billing view (admin/owner only)
-- ============================================================
REVOKE SELECT (stripe_customer_id, stripe_subscription_id, stripe_connect_account_id, owner_email)
  ON public.workspaces FROM authenticated, anon;
