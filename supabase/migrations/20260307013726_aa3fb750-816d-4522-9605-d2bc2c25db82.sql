
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS portal_greeting text,
  ADD COLUMN IF NOT EXISTS priority_level text DEFAULT 'medium',
  ADD COLUMN IF NOT EXISTS risk_level text DEFAULT 'low',
  ADD COLUMN IF NOT EXISTS custom_fields jsonb DEFAULT '[]'::jsonb;
