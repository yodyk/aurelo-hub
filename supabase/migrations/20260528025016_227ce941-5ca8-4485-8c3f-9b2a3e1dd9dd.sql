
-- Extend checklist_items into mini task cards
ALTER TABLE public.checklist_items
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'todo',
  ADD COLUMN IF NOT EXISTS work_tags text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS due_date date,
  ADD COLUMN IF NOT EXISTS estimated_hours numeric,
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS priority text;

ALTER TABLE public.checklist_items
  DROP CONSTRAINT IF EXISTS checklist_items_status_check;
ALTER TABLE public.checklist_items
  ADD CONSTRAINT checklist_items_status_check
  CHECK (status IN ('todo','in_progress','blocked','done'));

ALTER TABLE public.checklist_items
  DROP CONSTRAINT IF EXISTS checklist_items_priority_check;
ALTER TABLE public.checklist_items
  ADD CONSTRAINT checklist_items_priority_check
  CHECK (priority IS NULL OR priority IN ('low','medium','high'));

-- Backfill status from existing completed flag
UPDATE public.checklist_items SET status = 'done' WHERE completed = true AND status = 'todo';

-- Keep completed and status in sync (status is the source of truth)
CREATE OR REPLACE FUNCTION public.sync_checklist_item_status()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  -- If status changed, derive completed
  IF TG_OP = 'INSERT' OR NEW.status IS DISTINCT FROM OLD.status THEN
    NEW.completed := (NEW.status = 'done');
  -- If only completed changed (legacy clients), derive status
  ELSIF NEW.completed IS DISTINCT FROM OLD.completed THEN
    NEW.status := CASE WHEN NEW.completed THEN 'done' ELSE 'todo' END;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_checklist_item_status_trg ON public.checklist_items;
CREATE TRIGGER sync_checklist_item_status_trg
BEFORE INSERT OR UPDATE ON public.checklist_items
FOR EACH ROW EXECUTE FUNCTION public.sync_checklist_item_status();
