
-- Add retainer lifecycle fields to clients
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS retainer_cycle_start date DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS retainer_cycle_days integer NOT NULL DEFAULT 30,
  ADD COLUMN IF NOT EXISTS retainer_status text NOT NULL DEFAULT 'active';

-- Create retainer_history table for tracking past cycles
CREATE TABLE public.retainer_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  cycle_start date NOT NULL,
  cycle_end date NOT NULL,
  hours_total numeric NOT NULL DEFAULT 0,
  hours_used numeric NOT NULL DEFAULT 0,
  hours_remaining numeric NOT NULL DEFAULT 0,
  revenue numeric NOT NULL DEFAULT 0,
  rate numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- RLS for retainer_history
ALTER TABLE public.retainer_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace access for retainer history"
  ON public.retainer_history
  FOR ALL
  TO public
  USING (workspace_id IN (SELECT get_user_workspace_ids()));
