
-- Replace overly permissive INSERT policy with a restrictive one
-- Webhook uses service role (bypasses RLS), so no anon/authenticated inserts needed
DROP POLICY "Service role can insert email events" ON public.email_events;

CREATE POLICY "No direct insert on email_events"
  ON public.email_events FOR INSERT
  WITH CHECK (false);
