// Fire-and-forget webhook dispatch helper
import { supabase } from '@/integrations/supabase/client';

export function dispatchWebhookEvent(
  workspaceId: string,
  eventType: string,
  payload: Record<string, any>,
) {
  // Non-blocking: don't await, don't throw
  supabase.functions
    .invoke('dispatch-webhook', {
      body: { workspace_id: workspaceId, event_type: eventType, payload },
    })
    .then(({ error }) => {
      if (error) console.warn('[webhook] dispatch failed:', eventType, error.message);
    })
    .catch((err) => {
      console.warn('[webhook] dispatch error:', eventType, err);
    });
}
