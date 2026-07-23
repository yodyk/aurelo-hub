ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS sort_order integer DEFAULT 0;

WITH ranked AS (
  SELECT id, workspace_id,
         ROW_NUMBER() OVER (PARTITION BY workspace_id ORDER BY name) AS rn
  FROM public.clients
)
UPDATE public.clients c
SET sort_order = ranked.rn * 10
FROM ranked
WHERE c.id = ranked.id
  AND c.sort_order = 0;

CREATE INDEX IF NOT EXISTS idx_clients_workspace_sort_order
  ON public.clients (workspace_id, sort_order);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.clients TO authenticated;
GRANT ALL ON public.clients TO service_role;
