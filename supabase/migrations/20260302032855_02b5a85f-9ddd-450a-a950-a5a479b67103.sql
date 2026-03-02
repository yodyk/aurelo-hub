
-- Track email delivery events from Resend webhooks
CREATE TABLE public.email_events (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  notification_id uuid REFERENCES public.notifications(id) ON DELETE SET NULL,
  resend_email_id text NOT NULL,
  recipient text NOT NULL,
  event_type text NOT NULL DEFAULT 'sent', -- sent, delivered, bounced, opened, complained
  bounce_type text, -- hard, soft (only for bounced events)
  raw_payload jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Index for fast lookups by resend email ID (webhook events arrive by this ID)
CREATE INDEX idx_email_events_resend_id ON public.email_events(resend_email_id);
CREATE INDEX idx_email_events_notification ON public.email_events(notification_id);
CREATE INDEX idx_email_events_workspace ON public.email_events(workspace_id);

-- Enable RLS
ALTER TABLE public.email_events ENABLE ROW LEVEL SECURITY;

-- Workspace members can read email events
CREATE POLICY "Workspace members can read email events"
  ON public.email_events FOR SELECT
  USING (workspace_id IN (SELECT get_user_workspace_ids()));

-- Only system (service role via edge functions) inserts, but we need a permissive policy for the webhook
-- The webhook uses service role key, so this is fine
CREATE POLICY "Service role can insert email events"
  ON public.email_events FOR INSERT
  WITH CHECK (true);
