
CREATE TABLE public.checklist_item_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  checklist_item_id uuid NOT NULL,
  workspace_id uuid NOT NULL,
  client_id uuid NOT NULL,
  link_type text NOT NULL CHECK (link_type IN ('note', 'file')),
  note_id uuid,
  file_path text,
  file_name text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT one_target CHECK (
    (link_type = 'note' AND note_id IS NOT NULL AND file_path IS NULL) OR
    (link_type = 'file' AND file_path IS NOT NULL AND note_id IS NULL)
  )
);

CREATE INDEX idx_cil_item ON public.checklist_item_links(checklist_item_id);
CREATE INDEX idx_cil_client ON public.checklist_item_links(client_id);

GRANT SELECT, INSERT, DELETE ON public.checklist_item_links TO authenticated;
GRANT ALL ON public.checklist_item_links TO service_role;

ALTER TABLE public.checklist_item_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view task links"
  ON public.checklist_item_links FOR SELECT
  USING (workspace_id IN (SELECT public.get_user_workspace_ids()));

CREATE POLICY "Members can create task links"
  ON public.checklist_item_links FOR INSERT
  WITH CHECK (workspace_id IN (SELECT public.get_user_workspace_ids()));

CREATE POLICY "Members can delete task links"
  ON public.checklist_item_links FOR DELETE
  USING (workspace_id IN (SELECT public.get_user_workspace_ids()));

-- Validation trigger: enforce same-client scoping
CREATE OR REPLACE FUNCTION public.validate_checklist_item_link()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_item_client uuid;
  v_item_workspace uuid;
  v_note_client uuid;
  v_note_workspace uuid;
  v_expected_prefix text;
BEGIN
  -- Verify task belongs to the same client + workspace
  SELECT c.client_id, c.workspace_id
    INTO v_item_client, v_item_workspace
    FROM public.checklist_items ci
    JOIN public.checklists c ON c.id = ci.checklist_id
   WHERE ci.id = NEW.checklist_item_id;

  IF v_item_client IS NULL THEN
    RAISE EXCEPTION 'Task not found';
  END IF;
  IF v_item_client <> NEW.client_id OR v_item_workspace <> NEW.workspace_id THEN
    RAISE EXCEPTION 'Task does not belong to this client/workspace';
  END IF;

  IF NEW.link_type = 'note' THEN
    SELECT client_id, workspace_id INTO v_note_client, v_note_workspace
      FROM public.notes WHERE id = NEW.note_id;
    IF v_note_client IS NULL THEN
      RAISE EXCEPTION 'Note not found';
    END IF;
    IF v_note_client <> NEW.client_id OR v_note_workspace <> NEW.workspace_id THEN
      RAISE EXCEPTION 'Note does not belong to this client';
    END IF;
  ELSIF NEW.link_type = 'file' THEN
    -- Storage paths follow: {workspace_id}/client-{client_id}/...
    v_expected_prefix := NEW.workspace_id::text || '/client-' || NEW.client_id::text || '/';
    IF position(v_expected_prefix in NEW.file_path) <> 1 THEN
      RAISE EXCEPTION 'File does not belong to this client';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_checklist_item_link_trg
  BEFORE INSERT ON public.checklist_item_links
  FOR EACH ROW EXECUTE FUNCTION public.validate_checklist_item_link();
