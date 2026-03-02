
CREATE TRIGGER recalculate_client_on_session_change
  AFTER INSERT OR UPDATE OR DELETE ON public.sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_recalculate_client();
