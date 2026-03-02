
-- Notifications table for in-app + email notifications
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID, -- NULL = all workspace members; specific user_id = targeted
  category TEXT NOT NULL, -- 'session', 'invoice', 'team', 'client', 'insight'
  event_type TEXT NOT NULL, -- e.g. 'session_logged', 'invoice_paid', 'member_joined'
  title TEXT NOT NULL,
  body TEXT,
  metadata JSONB DEFAULT '{}'::jsonb, -- flexible payload (client_id, invoice_id, etc.)
  is_read BOOLEAN NOT NULL DEFAULT false,
  email_sent BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index for fast lookups
CREATE INDEX idx_notifications_workspace_user ON public.notifications(workspace_id, user_id, is_read, created_at DESC);
CREATE INDEX idx_notifications_created ON public.notifications(created_at DESC);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Members can see notifications targeted to them or broadcast (user_id IS NULL)
CREATE POLICY "Users can read own notifications"
  ON public.notifications FOR SELECT
  USING (
    workspace_id IN (SELECT get_user_workspace_ids())
    AND (user_id IS NULL OR user_id = auth.uid())
  );

-- Users can mark their own notifications as read
CREATE POLICY "Users can update own notifications"
  ON public.notifications FOR UPDATE
  USING (
    workspace_id IN (SELECT get_user_workspace_ids())
    AND (user_id IS NULL OR user_id = auth.uid())
  );

-- Workspace members can insert notifications (for triggering from client-side)
CREATE POLICY "Workspace members can create notifications"
  ON public.notifications FOR INSERT
  WITH CHECK (
    workspace_id IN (SELECT get_user_workspace_ids())
  );

-- Admins can delete notifications
CREATE POLICY "Admins can delete notifications"
  ON public.notifications FOR DELETE
  USING (
    workspace_id IN (SELECT get_user_workspace_ids())
    AND is_workspace_admin_or_owner(workspace_id)
  );

-- Notification preferences per user per workspace
CREATE TABLE public.notification_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  category TEXT NOT NULL, -- 'session', 'invoice', 'team', 'client', 'insight'
  in_app BOOLEAN NOT NULL DEFAULT true,
  email BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, user_id, category)
);

ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own preferences"
  ON public.notification_preferences FOR SELECT
  USING (user_id = auth.uid() AND workspace_id IN (SELECT get_user_workspace_ids()));

CREATE POLICY "Users can upsert own preferences"
  ON public.notification_preferences FOR INSERT
  WITH CHECK (user_id = auth.uid() AND workspace_id IN (SELECT get_user_workspace_ids()));

CREATE POLICY "Users can update own preferences"
  ON public.notification_preferences FOR UPDATE
  USING (user_id = auth.uid() AND workspace_id IN (SELECT get_user_workspace_ids()));

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
