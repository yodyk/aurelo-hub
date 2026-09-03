-- ── Employment (W-2) income & withholding context ────────────────────
-- Owner-only: these tables hold personal salary data.

CREATE TABLE public.employment_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  employer_name text NOT NULL,
  compensation_method text NOT NULL DEFAULT 'annual_salary' CHECK (compensation_method IN ('annual_salary','per_paycheck')),
  annual_salary numeric(14,2),
  gross_per_paycheck numeric(14,2),
  pay_frequency text NOT NULL DEFAULT 'biweekly' CHECK (pay_frequency IN ('weekly','biweekly','semimonthly','monthly','annual_manual')),
  anchor_payday date,
  semimonthly_day_1 smallint,
  semimonthly_day_2 smallint,
  monthly_day smallint,
  start_date date,
  end_date date,
  currency text NOT NULL DEFAULT 'USD',
  ytd_through_date date,
  ytd_gross numeric(14,2),
  ytd_federal_withheld numeric(14,2),
  ytd_state_withheld numeric(14,2),
  ytd_designated_federal numeric(14,2),
  ytd_designated_state numeric(14,2),
  additional_federal_per_paycheck numeric(14,2) NOT NULL DEFAULT 0,
  additional_state_per_paycheck numeric(14,2) NOT NULL DEFAULT 0,
  additional_designated_for_other_income boolean NOT NULL DEFAULT false,
  projection_mode text NOT NULL DEFAULT 'schedule' CHECK (projection_mode IN ('schedule','manual')),
  manual_remaining_designated numeric(14,2),
  tax_year integer NOT NULL DEFAULT EXTRACT(YEAR FROM CURRENT_DATE),
  notes text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.employment_sources TO authenticated;
GRANT ALL ON public.employment_sources TO service_role;
ALTER TABLE public.employment_sources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner manages employment sources" ON public.employment_sources
  FOR ALL TO authenticated
  USING (public.is_workspace_owner(workspace_id))
  WITH CHECK (public.is_workspace_owner(workspace_id));

CREATE TABLE public.employment_paychecks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  employment_source_id uuid NOT NULL REFERENCES public.employment_sources(id) ON DELETE CASCADE,
  occurrence_key text NOT NULL,
  pay_date date NOT NULL,
  status text NOT NULL DEFAULT 'projected' CHECK (status IN ('projected','confirmed')),
  kind text NOT NULL DEFAULT 'regular' CHECK (kind IN ('regular','bonus','commission','correction','other')),
  gross_amount numeric(14,2),
  federal_withheld numeric(14,2),
  state_withheld numeric(14,2),
  designated_additional_federal numeric(14,2) NOT NULL DEFAULT 0,
  designated_additional_state numeric(14,2) NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'USD',
  generated boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, employment_source_id, occurrence_key)
);
CREATE INDEX employment_paychecks_ws_date_idx ON public.employment_paychecks (workspace_id, pay_date);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.employment_paychecks TO authenticated;
GRANT ALL ON public.employment_paychecks TO service_role;
ALTER TABLE public.employment_paychecks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner manages employment paychecks" ON public.employment_paychecks
  FOR ALL TO authenticated
  USING (public.is_workspace_owner(workspace_id))
  WITH CHECK (public.is_workspace_owner(workspace_id));

CREATE TABLE public.tax_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'planned' CHECK (status IN ('planned','paid')),
  planned_date date,
  paid_date date,
  amount numeric(14,2) NOT NULL DEFAULT 0,
  tax_year integer NOT NULL,
  jurisdiction text NOT NULL DEFAULT 'federal' CHECK (jurisdiction IN ('federal','state','local','other')),
  period_label text,
  reference text,
  currency text NOT NULL DEFAULT 'USD',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX tax_payments_ws_year_idx ON public.tax_payments (workspace_id, tax_year);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tax_payments TO authenticated;
GRANT ALL ON public.tax_payments TO service_role;
ALTER TABLE public.tax_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner manages tax payments" ON public.tax_payments
  FOR ALL TO authenticated
  USING (public.is_workspace_owner(workspace_id))
  WITH CHECK (public.is_workspace_owner(workspace_id));

CREATE TABLE public.employment_settings (
  workspace_id uuid PRIMARY KEY REFERENCES public.workspaces(id) ON DELETE CASCADE,
  other_withholding_available numeric(14,2) NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.employment_settings TO authenticated;
GRANT ALL ON public.employment_settings TO service_role;
ALTER TABLE public.employment_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner manages employment settings" ON public.employment_settings
  FOR ALL TO authenticated
  USING (public.is_workspace_owner(workspace_id))
  WITH CHECK (public.is_workspace_owner(workspace_id));

CREATE TRIGGER employment_sources_updated_at BEFORE UPDATE ON public.employment_sources FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER employment_paychecks_updated_at BEFORE UPDATE ON public.employment_paychecks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER tax_payments_updated_at BEFORE UPDATE ON public.tax_payments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER employment_settings_updated_at BEFORE UPDATE ON public.employment_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();