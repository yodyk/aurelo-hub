ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS records jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS receipts jsonb NOT NULL DEFAULT '[]'::jsonb;
COMMENT ON COLUMN public.expenses.records IS 'Array of {label, value} detail records';
COMMENT ON COLUMN public.expenses.receipts IS 'Array of {path, name, size, mime, uploadedAt} in client-files bucket under {workspace_id}/expenses/{expense_id}/';