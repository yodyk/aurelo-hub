
-- Helper: timestamp trigger function (idempotent)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ── Phase 1: Task system schema refactor ───────────────────────────

ALTER TABLE public.checklist_items
  ALTER COLUMN checklist_id DROP NOT NULL;

ALTER TABLE public.checklist_items
  ADD COLUMN IF NOT EXISTS workspace_id uuid,
  ADD COLUMN IF NOT EXISTS client_id uuid,
  ADD COLUMN IF NOT EXISTS project_id uuid,
  ADD COLUMN IF NOT EXISTS waiting_on text,
  ADD COLUMN IF NOT EXISTS follow_up_at date,
  ADD COLUMN IF NOT EXISTS waiting_note text,
  ADD COLUMN IF NOT EXISTS recurrence_id uuid,
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS completed_at timestamptz;

UPDATE public.checklist_items ci
   SET workspace_id = c.workspace_id,
       client_id    = c.client_id,
       project_id   = COALESCE(ci.project_id, c.project_id)
  FROM public.checklists c
 WHERE ci.checklist_id = c.id
   AND (ci.workspace_id IS NULL OR ci.client_id IS NULL);

DO $$
DECLARE
  cname text;
BEGIN
  FOR cname IN
    SELECT conname FROM pg_constraint
     WHERE conrelid = 'public.checklist_items'::regclass
       AND contype  = 'c'
       AND pg_get_constraintdef(oid) ILIKE '%status%'
  LOOP
    EXECUTE format('ALTER TABLE public.checklist_items DROP CONSTRAINT %I', cname);
  END LOOP;
END $$;

UPDATE public.checklist_items
   SET status = CASE
     WHEN status = 'todo'                   THEN 'to_do'
     WHEN status IN ('blocked','on_hold')   THEN 'on_hold'
     WHEN status IN ('doing','in_progress') THEN 'in_progress'
     WHEN status = 'done'                   THEN 'complete'
     WHEN status IN ('to_do','in_review','complete') THEN status
     ELSE 'to_do'
   END;

UPDATE public.checklist_items
   SET completed_at = COALESCE(completed_at, now())
 WHERE status = 'complete' AND completed_at IS NULL;

ALTER TABLE public.checklist_items
  ADD CONSTRAINT checklist_items_status_check
  CHECK (status IN ('to_do','on_hold','in_progress','in_review','complete'));

CREATE OR REPLACE FUNCTION public.sync_checklist_item_status()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'INSERT' OR NEW.status IS DISTINCT FROM OLD.status THEN
    NEW.completed := (NEW.status = 'complete');
    IF NEW.status = 'complete' AND NEW.completed_at IS NULL THEN
      NEW.completed_at := now();
    ELSIF NEW.status <> 'complete' THEN
      NEW.completed_at := NULL;
    END IF;
  ELSIF NEW.completed IS DISTINCT FROM OLD.completed THEN
    NEW.status := CASE WHEN NEW.completed THEN 'complete' ELSE 'to_do' END;
    NEW.completed_at := CASE WHEN NEW.completed THEN now() ELSE NULL END;
  END IF;
  RETURN NEW;
END;
$function$;

DROP POLICY IF EXISTS "Workspace access for checklist items" ON public.checklist_items;

CREATE POLICY "Members can view tasks"
  ON public.checklist_items FOR SELECT
  USING (
    workspace_id IN (SELECT get_user_workspace_ids())
    OR (checklist_id IS NOT NULL AND checklist_id IN (
      SELECT id FROM public.checklists
      WHERE workspace_id IN (SELECT get_user_workspace_ids())
    ))
  );

CREATE POLICY "Members can insert tasks"
  ON public.checklist_items FOR INSERT
  WITH CHECK (
    workspace_id IN (SELECT get_user_workspace_ids())
    OR (checklist_id IS NOT NULL AND checklist_id IN (
      SELECT id FROM public.checklists
      WHERE workspace_id IN (SELECT get_user_workspace_ids())
    ))
  );

CREATE POLICY "Members can update tasks"
  ON public.checklist_items FOR UPDATE
  USING (
    workspace_id IN (SELECT get_user_workspace_ids())
    OR (checklist_id IS NOT NULL AND checklist_id IN (
      SELECT id FROM public.checklists
      WHERE workspace_id IN (SELECT get_user_workspace_ids())
    ))
  );

CREATE POLICY "Members can delete tasks"
  ON public.checklist_items FOR DELETE
  USING (
    workspace_id IN (SELECT get_user_workspace_ids())
    OR (checklist_id IS NOT NULL AND checklist_id IN (
      SELECT id FROM public.checklists
      WHERE workspace_id IN (SELECT get_user_workspace_ids())
    ))
  );

CREATE INDEX IF NOT EXISTS idx_checklist_items_workspace
  ON public.checklist_items (workspace_id);
CREATE INDEX IF NOT EXISTS idx_checklist_items_client
  ON public.checklist_items (client_id);
CREATE INDEX IF NOT EXISTS idx_checklist_items_project
  ON public.checklist_items (project_id);
CREATE INDEX IF NOT EXISTS idx_checklist_items_due
  ON public.checklist_items (due_date) WHERE status <> 'complete';
CREATE INDEX IF NOT EXISTS idx_checklist_items_followup
  ON public.checklist_items (follow_up_at) WHERE follow_up_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_checklist_items_recurrence
  ON public.checklist_items (recurrence_id) WHERE recurrence_id IS NOT NULL;


-- ── Task recurrences (templates) ──────────────────────────────────

CREATE TABLE IF NOT EXISTS public.task_recurrences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  client_id uuid NOT NULL,
  project_id uuid,
  checklist_id uuid,
  title text NOT NULL,
  notes_md text,
  priority text CHECK (priority IS NULL OR priority IN ('low','normal','high')),
  estimated_hours numeric,
  frequency text NOT NULL CHECK (frequency IN ('daily','weekly','monthly','quarterly','custom_days')),
  day_of_week smallint,
  day_of_month smallint,
  every_n_days int,
  lead_days int NOT NULL DEFAULT 2 CHECK (lead_days >= 0 AND lead_days <= 7),
  active boolean NOT NULL DEFAULT true,
  last_generated_on date,
  next_due_on date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.task_recurrences TO authenticated;
GRANT ALL ON public.task_recurrences TO service_role;

ALTER TABLE public.task_recurrences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view task recurrences"
  ON public.task_recurrences FOR SELECT
  TO authenticated
  USING (workspace_id IN (SELECT get_user_workspace_ids()));

CREATE POLICY "Admins can insert task recurrences"
  ON public.task_recurrences FOR INSERT
  TO authenticated
  WITH CHECK (
    workspace_id IN (SELECT get_user_workspace_ids())
    AND is_workspace_admin_or_owner(workspace_id)
  );

CREATE POLICY "Admins can update task recurrences"
  ON public.task_recurrences FOR UPDATE
  TO authenticated
  USING (
    workspace_id IN (SELECT get_user_workspace_ids())
    AND is_workspace_admin_or_owner(workspace_id)
  );

CREATE POLICY "Admins can delete task recurrences"
  ON public.task_recurrences FOR DELETE
  TO authenticated
  USING (
    workspace_id IN (SELECT get_user_workspace_ids())
    AND is_workspace_admin_or_owner(workspace_id)
  );

CREATE INDEX IF NOT EXISTS idx_task_recurrences_workspace
  ON public.task_recurrences (workspace_id);
CREATE INDEX IF NOT EXISTS idx_task_recurrences_next_due
  ON public.task_recurrences (next_due_on) WHERE active = true;

DROP TRIGGER IF EXISTS task_recurrences_updated_at ON public.task_recurrences;
CREATE TRIGGER task_recurrences_updated_at
  BEFORE UPDATE ON public.task_recurrences
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
