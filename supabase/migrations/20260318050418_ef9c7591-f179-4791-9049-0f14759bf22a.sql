-- Checklists table
CREATE TABLE public.checklists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT 'Checklist',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.checklists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace access for checklists"
  ON public.checklists FOR ALL
  USING (workspace_id IN (SELECT get_user_workspace_ids()));

-- Checklist items table
CREATE TABLE public.checklist_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  checklist_id uuid NOT NULL REFERENCES public.checklists(id) ON DELETE CASCADE,
  text text NOT NULL DEFAULT '',
  completed boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  added_by text NOT NULL DEFAULT 'owner',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.checklist_items ENABLE ROW LEVEL SECURITY;

-- RLS: workspace members can manage items via checklist ownership
CREATE POLICY "Workspace access for checklist items"
  ON public.checklist_items FOR ALL
  USING (
    checklist_id IN (
      SELECT id FROM public.checklists
      WHERE workspace_id IN (SELECT get_user_workspace_ids())
    )
  );