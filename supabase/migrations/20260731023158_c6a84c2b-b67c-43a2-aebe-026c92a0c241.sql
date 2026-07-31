-- 1. System identifier for the automatic fallback list
ALTER TABLE public.checklists
  ADD COLUMN IF NOT EXISTS is_default boolean NOT NULL DEFAULT false;

-- 2. Backfill missing parent-derived refs on items. Never overwrite an
--    existing explicit task-level value.
UPDATE public.checklist_items ci
   SET workspace_id = COALESCE(ci.workspace_id, c.workspace_id),
       client_id    = COALESCE(ci.client_id,    c.client_id),
       project_id   = COALESCE(ci.project_id,   c.project_id)
  FROM public.checklists c
 WHERE ci.checklist_id = c.id
   AND (ci.workspace_id IS NULL
        OR ci.client_id IS NULL
        OR (ci.project_id IS NULL AND c.project_id IS NOT NULL));

-- 3. Adopt at most one pre-existing client-level list named "General" per
--    client as the default. Oldest wins; project lists are never adopted.
WITH ranked AS (
  SELECT id,
         row_number() OVER (PARTITION BY workspace_id, client_id ORDER BY created_at) AS rn
    FROM public.checklists
   WHERE project_id IS NULL
     AND lower(title) = 'general'
)
UPDATE public.checklists c
   SET is_default = true
  FROM ranked r
 WHERE c.id = r.id
   AND r.rn = 1
   AND NOT EXISTS (
     SELECT 1 FROM public.checklists d
      WHERE d.workspace_id = c.workspace_id
        AND d.client_id = c.client_id
        AND d.project_id IS NULL
        AND d.is_default
   );

-- 4. Create a private default list for every client that owns listless tasks
--    and has no default list yet. Skips tasks with unrecoverable relations.
INSERT INTO public.checklists (workspace_id, client_id, project_id, title, shared_with_client, is_default)
SELECT DISTINCT ci.workspace_id, ci.client_id, NULL::uuid, 'General', false, true
  FROM public.checklist_items ci
  JOIN public.clients cl ON cl.id = ci.client_id AND cl.workspace_id = ci.workspace_id
 WHERE ci.checklist_id IS NULL
   AND ci.client_id IS NOT NULL
   AND ci.workspace_id IS NOT NULL
   AND NOT EXISTS (
     SELECT 1 FROM public.checklists c
      WHERE c.workspace_id = ci.workspace_id
        AND c.client_id = ci.client_id
        AND c.project_id IS NULL
        AND c.is_default
   );

-- 5. Attach listless tasks to their client's default list.
UPDATE public.checklist_items ci
   SET checklist_id = c.id
  FROM public.checklists c
 WHERE ci.checklist_id IS NULL
   AND ci.client_id IS NOT NULL
   AND ci.workspace_id IS NOT NULL
   AND c.workspace_id = ci.workspace_id
   AND c.client_id = ci.client_id
   AND c.project_id IS NULL
   AND c.is_default;

-- 6. One default list per client, enforced.
CREATE UNIQUE INDEX IF NOT EXISTS checklists_one_default_per_client
  ON public.checklists (workspace_id, client_id)
  WHERE is_default AND project_id IS NULL;

-- 7. Safeguard: items always inherit missing refs from their parent list.
CREATE OR REPLACE FUNCTION public.fill_checklist_item_parent_refs()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  p RECORD;
BEGIN
  IF NEW.checklist_id IS NOT NULL THEN
    SELECT workspace_id, client_id, project_id INTO p
      FROM public.checklists WHERE id = NEW.checklist_id;
    IF FOUND THEN
      NEW.workspace_id := COALESCE(NEW.workspace_id, p.workspace_id);
      NEW.client_id    := COALESCE(NEW.client_id,    p.client_id);
      NEW.project_id   := COALESCE(NEW.project_id,   p.project_id);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS fill_checklist_item_parent_refs_trg ON public.checklist_items;
CREATE TRIGGER fill_checklist_item_parent_refs_trg
  BEFORE INSERT OR UPDATE ON public.checklist_items
  FOR EACH ROW EXECUTE FUNCTION public.fill_checklist_item_parent_refs();

-- 8. Diagnostic report for the rollout window (admin/read-only).
CREATE OR REPLACE VIEW public.task_integrity_report
WITH (security_invoker = on) AS
SELECT
  (SELECT count(*) FROM public.checklist_items WHERE checklist_id IS NULL) AS listless_tasks,
  (SELECT count(*) FROM public.checklist_items WHERE client_id IS NULL) AS tasks_missing_client,
  (SELECT count(*) FROM public.checklist_items ci JOIN public.checklists c ON c.id = ci.checklist_id
     WHERE ci.client_id IS DISTINCT FROM c.client_id) AS client_mismatches,
  (SELECT count(*) FROM public.checklist_items ci JOIN public.checklists c ON c.id = ci.checklist_id
     WHERE ci.workspace_id IS DISTINCT FROM c.workspace_id) AS workspace_mismatches,
  (SELECT count(*) FROM public.checklist_items ci
     WHERE ci.checklist_id IS NOT NULL
       AND NOT EXISTS (SELECT 1 FROM public.checklists c WHERE c.id = ci.checklist_id)) AS tasks_with_invalid_list,
  (SELECT count(*) FROM (
     SELECT workspace_id, client_id FROM public.checklists
      WHERE is_default AND project_id IS NULL
      GROUP BY workspace_id, client_id HAVING count(*) > 1) d) AS duplicate_default_lists;

GRANT SELECT ON public.task_integrity_report TO authenticated;
GRANT SELECT ON public.task_integrity_report TO service_role;