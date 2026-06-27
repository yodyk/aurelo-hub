-- ── Phase 1 Financial Foundation ────────────────────────────────────

-- 1. clients: billing_model + monthly_contract_value
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS billing_model text NOT NULL DEFAULT 'Hourly',
  ADD COLUMN IF NOT EXISTS monthly_contract_value numeric(10,2) DEFAULT 0;

-- Backfill billing_model from legacy `model` column
UPDATE public.clients
   SET billing_model = CASE
     WHEN model = 'Project'  THEN 'FixedFee'
     WHEN model = 'Retainer' THEN 'Retainer'
     ELSE 'Hourly'
   END;

-- Seed monthly_contract_value for existing retainers (rate × allotted hours)
UPDATE public.clients
   SET monthly_contract_value = COALESCE(rate, 0) * COALESCE(retainer_total, 0)
 WHERE billing_model = 'Retainer'
   AND COALESCE(monthly_contract_value, 0) = 0;

-- Enforce allowed values
ALTER TABLE public.clients
  DROP CONSTRAINT IF EXISTS clients_billing_model_check;
ALTER TABLE public.clients
  ADD CONSTRAINT clients_billing_model_check
  CHECK (billing_model IN ('Hourly', 'Retainer', 'FixedFee', 'Milestone', 'Subscription'));

-- 2. projects: billing_model + contract_value + completed_at
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS billing_model text,
  ADD COLUMN IF NOT EXISTS contract_value numeric(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS completed_at date;

-- Backfill contract_value from legacy total_value
UPDATE public.projects
   SET contract_value = COALESCE(total_value, 0)
 WHERE COALESCE(contract_value, 0) = 0;

-- Backfill completed_at for projects already marked Complete
UPDATE public.projects
   SET completed_at = COALESCE(updated_at::date, CURRENT_DATE)
 WHERE status = 'Complete' AND completed_at IS NULL;

ALTER TABLE public.projects
  DROP CONSTRAINT IF EXISTS projects_billing_model_check;
ALTER TABLE public.projects
  ADD CONSTRAINT projects_billing_model_check
  CHECK (billing_model IS NULL OR billing_model IN ('Hourly', 'Retainer', 'FixedFee', 'Milestone', 'Subscription'));

-- 3. sessions: labor_value (engine-only term; never shown in UI)
ALTER TABLE public.sessions
  ADD COLUMN IF NOT EXISTS labor_value numeric(10,2) DEFAULT 0;

-- Backfill from legacy revenue column
UPDATE public.sessions
   SET labor_value = COALESCE(revenue, 0)
 WHERE COALESCE(labor_value, 0) = 0;

-- 4. Trigger: maintain completed_at automatically
CREATE OR REPLACE FUNCTION public.set_project_completed_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.status = 'Complete' AND NEW.completed_at IS NULL THEN
      NEW.completed_at := CURRENT_DATE;
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.status = 'Complete' AND OLD.status IS DISTINCT FROM 'Complete' THEN
      NEW.completed_at := COALESCE(NEW.completed_at, CURRENT_DATE);
    ELSIF NEW.status <> 'Complete' AND OLD.status = 'Complete' THEN
      NEW.completed_at := NULL;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_project_completed_at ON public.projects;
CREATE TRIGGER trg_set_project_completed_at
BEFORE INSERT OR UPDATE OF status ON public.projects
FOR EACH ROW EXECUTE FUNCTION public.set_project_completed_at();