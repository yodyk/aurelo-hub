
CREATE TABLE public.recurring_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  task TEXT,
  notes TEXT,
  duration NUMERIC NOT NULL DEFAULT 1,
  billable BOOLEAN NOT NULL DEFAULT true,
  frequency TEXT NOT NULL DEFAULT 'daily',
  skip_weekends BOOLEAN NOT NULL DEFAULT true,
  active BOOLEAN NOT NULL DEFAULT true,
  last_run_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.recurring_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace access for recurring sessions"
  ON public.recurring_sessions
  FOR ALL
  USING (workspace_id IN (SELECT get_user_workspace_ids()));
