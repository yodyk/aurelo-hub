
-- Invoice templates (presets) for Studio plan
CREATE TABLE public.invoice_templates (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name text NOT NULL,
  line_items jsonb NOT NULL DEFAULT '[]'::jsonb,
  payment_terms text,
  notes text,
  tax_rate numeric DEFAULT 0,
  currency text DEFAULT 'USD',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.invoice_templates ENABLE ROW LEVEL SECURITY;

-- Workspace-scoped access
CREATE POLICY "Workspace access for invoice templates"
  ON public.invoice_templates
  FOR ALL
  USING (workspace_id IN (SELECT get_user_workspace_ids()));
