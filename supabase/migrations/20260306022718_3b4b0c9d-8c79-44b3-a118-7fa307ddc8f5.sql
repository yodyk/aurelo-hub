
-- Add frequency and email_limit columns to notification_preferences
ALTER TABLE public.notification_preferences
  ADD COLUMN IF NOT EXISTS frequency text NOT NULL DEFAULT 'instant',
  ADD COLUMN IF NOT EXISTS email_monthly_limit integer;

-- Create notification_recipients table for per-category recipient control
CREATE TABLE public.notification_recipients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  category text NOT NULL,
  member_id uuid NOT NULL REFERENCES public.workspace_members(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, category, member_id)
);

-- Enable RLS
ALTER TABLE public.notification_recipients ENABLE ROW LEVEL SECURITY;

-- RLS: workspace members can read
CREATE POLICY "Workspace members can read recipients"
  ON public.notification_recipients FOR SELECT
  USING (workspace_id IN (SELECT get_user_workspace_ids()));

-- RLS: admins/owners can manage
CREATE POLICY "Admins can insert recipients"
  ON public.notification_recipients FOR INSERT
  WITH CHECK (workspace_id IN (SELECT get_user_workspace_ids()) AND is_workspace_admin_or_owner(workspace_id));

CREATE POLICY "Admins can delete recipients"
  ON public.notification_recipients FOR DELETE
  USING (workspace_id IN (SELECT get_user_workspace_ids()) AND is_workspace_admin_or_owner(workspace_id));

-- Create email_quotas table to track monthly email usage per workspace
CREATE TABLE public.email_quotas (
  workspace_id uuid PRIMARY KEY REFERENCES public.workspaces(id) ON DELETE CASCADE,
  month text NOT NULL DEFAULT to_char(now(), 'YYYY-MM'),
  emails_sent integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.email_quotas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace members can read email quotas"
  ON public.email_quotas FOR SELECT
  USING (workspace_id IN (SELECT get_user_workspace_ids()));

-- Service role will handle inserts/updates via edge functions, but allow workspace insert for initialization
CREATE POLICY "Admins can upsert email quotas"
  ON public.email_quotas FOR INSERT
  WITH CHECK (workspace_id IN (SELECT get_user_workspace_ids()));

CREATE POLICY "Admins can update email quotas"
  ON public.email_quotas FOR UPDATE
  USING (workspace_id IN (SELECT get_user_workspace_ids()));
