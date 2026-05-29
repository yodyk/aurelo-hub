ALTER TABLE public.checklist_items
  ADD COLUMN IF NOT EXISTS repeat TEXT
  CHECK (repeat IN ('weekly','monthly','quarterly'));