-- Phase 5: portal_questions
CREATE TABLE public.portal_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  client_id uuid NOT NULL,
  project_id uuid,
  asked_by text NOT NULL CHECK (asked_by IN ('owner','client')),
  asked_by_user_id uuid,
  question text NOT NULL,
  answer text,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','answered','closed')),
  asked_at timestamptz NOT NULL DEFAULT now(),
  answered_at timestamptz,
  answered_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.portal_questions TO authenticated;
GRANT ALL ON public.portal_questions TO service_role;

ALTER TABLE public.portal_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view portal questions"
ON public.portal_questions FOR SELECT TO authenticated
USING (workspace_id IN (SELECT get_user_workspace_ids()));

CREATE POLICY "Admins can insert portal questions"
ON public.portal_questions FOR INSERT TO authenticated
WITH CHECK (workspace_id IN (SELECT get_user_workspace_ids()) AND is_workspace_admin_or_owner(workspace_id));

CREATE POLICY "Admins can update portal questions"
ON public.portal_questions FOR UPDATE TO authenticated
USING (workspace_id IN (SELECT get_user_workspace_ids()) AND is_workspace_admin_or_owner(workspace_id));

CREATE POLICY "Admins can delete portal questions"
ON public.portal_questions FOR DELETE TO authenticated
USING (workspace_id IN (SELECT get_user_workspace_ids()) AND is_workspace_admin_or_owner(workspace_id));

CREATE INDEX idx_portal_questions_client ON public.portal_questions (workspace_id, client_id, status, asked_at DESC);

CREATE TRIGGER trg_portal_questions_updated
BEFORE UPDATE ON public.portal_questions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();