
-- Function to recalculate client aggregate fields from actual session data
CREATE OR REPLACE FUNCTION public.recalculate_client_aggregates(p_client_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_hours numeric;
  v_lifetime numeric;
  v_monthly numeric;
  v_last_date date;
  v_true_rate numeric;
BEGIN
  -- Total hours logged
  SELECT COALESCE(SUM(duration), 0)
    INTO v_hours
    FROM sessions
   WHERE client_id = p_client_id;

  -- Lifetime revenue (sum of all session revenue)
  SELECT COALESCE(SUM(revenue), 0)
    INTO v_lifetime
    FROM sessions
   WHERE client_id = p_client_id
     AND billable = true;

  -- Monthly earnings (current calendar month)
  SELECT COALESCE(SUM(revenue), 0)
    INTO v_monthly
    FROM sessions
   WHERE client_id = p_client_id
     AND billable = true
     AND date >= date_trunc('month', CURRENT_DATE)::date;

  -- Last session date
  SELECT MAX(date)
    INTO v_last_date
    FROM sessions
   WHERE client_id = p_client_id;

  -- True hourly rate (lifetime revenue / total hours, avoid div by zero)
  IF v_hours > 0 THEN
    v_true_rate := v_lifetime / v_hours;
  ELSE
    v_true_rate := 0;
  END IF;

  UPDATE clients
     SET hours_logged = v_hours,
         lifetime_revenue = v_lifetime,
         monthly_earnings = v_monthly,
         last_session_date = v_last_date,
         true_hourly_rate = v_true_rate,
         updated_at = now()
   WHERE id = p_client_id;
END;
$$;

-- Trigger function to auto-recalculate after session changes
CREATE OR REPLACE FUNCTION public.trigger_recalculate_client()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM recalculate_client_aggregates(OLD.client_id);
    RETURN OLD;
  ELSE
    PERFORM recalculate_client_aggregates(NEW.client_id);
    -- If client_id changed on UPDATE, also recalc the old client
    IF TG_OP = 'UPDATE' AND OLD.client_id IS DISTINCT FROM NEW.client_id THEN
      PERFORM recalculate_client_aggregates(OLD.client_id);
    END IF;
    RETURN NEW;
  END IF;
END;
$$;

-- Attach trigger to sessions table
CREATE TRIGGER trg_recalculate_client_on_session
AFTER INSERT OR UPDATE OR DELETE ON public.sessions
FOR EACH ROW
EXECUTE FUNCTION public.trigger_recalculate_client();

-- Batch recalculate all clients in a workspace
CREATE OR REPLACE FUNCTION public.recalculate_all_client_aggregates(p_workspace_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r record;
BEGIN
  FOR r IN SELECT id FROM clients WHERE workspace_id = p_workspace_id
  LOOP
    PERFORM recalculate_client_aggregates(r.id);
  END LOOP;
END;
$$;
