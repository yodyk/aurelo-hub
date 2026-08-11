-- 1) Purge raw API keys copied into broadly-readable workspace_settings
DELETE FROM public.workspace_settings WHERE section = 'apikey';

-- 2) Single-use, session-bound state tokens for Stripe Connect OAuth
CREATE TABLE public.stripe_oauth_states (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  state text NOT NULL UNIQUE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  used_at timestamp with time zone,
  expires_at timestamp with time zone NOT NULL DEFAULT (now() + interval '15 minutes'),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Only edge functions (service role) may touch this table; no anon/authenticated grants.
GRANT ALL ON public.stripe_oauth_states TO service_role;

ALTER TABLE public.stripe_oauth_states ENABLE ROW LEVEL SECURITY;
-- No policies: default deny for anon/authenticated. service_role bypasses RLS.

CREATE INDEX idx_stripe_oauth_states_state ON public.stripe_oauth_states(state);