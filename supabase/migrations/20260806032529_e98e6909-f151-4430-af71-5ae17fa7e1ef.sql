ALTER TABLE public.shared_resources RENAME TO client_documents;
ALTER TABLE public.resource_approvals RENAME TO document_approvals;
ALTER TABLE public.document_approvals RENAME COLUMN resource_id TO document_id;

ALTER TABLE public.client_documents
  ADD COLUMN IF NOT EXISTS visibility text NOT NULL DEFAULT 'internal',
  ADD COLUMN IF NOT EXISTS category text,
  ADD COLUMN IF NOT EXISTS lifecycle_state text NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS approval_state text NOT NULL DEFAULT 'not_required',
  ADD COLUMN IF NOT EXISTS document_date date,
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS file_name text,
  ADD COLUMN IF NOT EXISTS file_size bigint,
  ADD COLUMN IF NOT EXISTS mime_type text,
  ADD COLUMN IF NOT EXISTS is_pinned boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS updated_by uuid,
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

UPDATE public.client_documents
SET visibility = 'shared',
    document_date = COALESCE(document_date, created_at::date),
    approval_state = CASE
      WHEN needs_approval THEN 'pending'
      WHEN status = 'approved' THEN 'approved'
      ELSE 'not_required'
    END;

ALTER TABLE public.client_documents
  ADD CONSTRAINT client_documents_visibility_check CHECK (visibility IN ('internal','shared')),
  ADD CONSTRAINT client_documents_lifecycle_check CHECK (lifecycle_state IN ('active','archived')),
  ADD CONSTRAINT client_documents_approval_check CHECK (approval_state IN ('not_required','pending','approved','rejected'));

CREATE INDEX IF NOT EXISTS idx_client_documents_client ON public.client_documents (workspace_id, client_id, lifecycle_state);
CREATE INDEX IF NOT EXISTS idx_document_approvals_document ON public.document_approvals (document_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.client_documents TO authenticated;
GRANT ALL ON public.client_documents TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.document_approvals TO authenticated;
GRANT ALL ON public.document_approvals TO service_role;