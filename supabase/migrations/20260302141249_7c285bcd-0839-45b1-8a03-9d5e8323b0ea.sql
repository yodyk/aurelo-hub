-- Add logged_by column to sessions (references auth.users indirectly via uuid)
ALTER TABLE public.sessions
  ADD COLUMN logged_by uuid;

-- Backfill: set logged_by to the workspace owner for existing sessions
UPDATE public.sessions s
SET logged_by = w.owner_id
FROM public.workspaces w
WHERE s.workspace_id = w.id
  AND s.logged_by IS NULL;

-- Now make it NOT NULL going forward
ALTER TABLE public.sessions
  ALTER COLUMN logged_by SET NOT NULL;