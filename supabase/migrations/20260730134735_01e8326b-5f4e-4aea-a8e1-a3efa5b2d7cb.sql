ALTER TABLE public.recurring_sessions
  ADD COLUMN IF NOT EXISTS allocation_type text;

ALTER TABLE public.recurring_sessions
  ADD CONSTRAINT recurring_sessions_allocation_type_check
  CHECK (allocation_type IS NULL OR allocation_type IN ('project','retainer','general'));