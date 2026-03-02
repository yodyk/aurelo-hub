
-- Webhooks table: stores registered webhook endpoints
CREATE TABLE public.webhooks (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  url text NOT NULL,
  events text[] NOT NULL DEFAULT '{}',
  signing_secret text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Webhook deliveries table: logs each delivery attempt
CREATE TABLE public.webhook_deliveries (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  webhook_id uuid NOT NULL REFERENCES public.webhooks(id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}',
  status_code integer,
  response_body text,
  attempt integer NOT NULL DEFAULT 1,
  success boolean NOT NULL DEFAULT false,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_webhooks_workspace ON public.webhooks(workspace_id);
CREATE INDEX idx_webhook_deliveries_webhook ON public.webhook_deliveries(webhook_id);
CREATE INDEX idx_webhook_deliveries_workspace ON public.webhook_deliveries(workspace_id);
CREATE INDEX idx_webhook_deliveries_created ON public.webhook_deliveries(created_at DESC);

-- Enable RLS
ALTER TABLE public.webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_deliveries ENABLE ROW LEVEL SECURITY;

-- RLS for webhooks: workspace members can read, admins/owners can manage
CREATE POLICY "Workspace members can view webhooks"
  ON public.webhooks FOR SELECT
  USING (workspace_id IN (SELECT get_user_workspace_ids()));

CREATE POLICY "Admins can create webhooks"
  ON public.webhooks FOR INSERT
  WITH CHECK (workspace_id IN (SELECT get_user_workspace_ids()) AND is_workspace_admin_or_owner(workspace_id));

CREATE POLICY "Admins can update webhooks"
  ON public.webhooks FOR UPDATE
  USING (workspace_id IN (SELECT get_user_workspace_ids()) AND is_workspace_admin_or_owner(workspace_id));

CREATE POLICY "Admins can delete webhooks"
  ON public.webhooks FOR DELETE
  USING (workspace_id IN (SELECT get_user_workspace_ids()) AND is_workspace_admin_or_owner(workspace_id));

-- RLS for deliveries: workspace members can read, no direct insert/update/delete from client
CREATE POLICY "Workspace members can view deliveries"
  ON public.webhook_deliveries FOR SELECT
  USING (workspace_id IN (SELECT get_user_workspace_ids()));

CREATE POLICY "No direct client insert on deliveries"
  ON public.webhook_deliveries FOR INSERT
  WITH CHECK (false);
