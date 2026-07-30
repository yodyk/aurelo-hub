/**
 * ClientAvatar — small circular client favicon with initial fallback.
 *
 * Always renders a perfect 1:1 circle. Pair with useClientFavicons() to
 * resolve favicon URLs from the workspace `logos` bucket once per list.
 */
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

/** Loads client favicon URLs for a workspace, keyed by client id. */
export function useClientFavicons(workspaceId?: string | null) {
  const [faviconUrls, setFaviconUrls] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!workspaceId) return;
    let cancelled = false;
    supabase.storage.from('logos').list(workspaceId, { limit: 500 }).then(({ data }) => {
      if (cancelled || !data) return;
      const urls: Record<string, string> = {};
      for (const f of data) {
        const match = f.name.match(/^client-(.+)-favicon\./);
        if (match) {
          urls[match[1]] = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/logos/${workspaceId}/${f.name}`;
        }
      }
      setFaviconUrls(urls);
    });
    return () => { cancelled = true; };
  }, [workspaceId]);

  return faviconUrls;
}

export function ClientAvatar({
  name, url, size = 36,
}: {
  name?: string;
  url?: string;
  size?: number;
}) {
  const box = { width: size, height: size, minWidth: size, minHeight: size, aspectRatio: '1 / 1' } as const;

  if (url) {
    return (
      <img
        src={url}
        alt=""
        aria-hidden="true"
        className="rounded-circle object-cover flex-shrink-0"
        style={{ ...box, boxShadow: '0 0 0 1px var(--hairline)' }}
      />
    );
  }

  return (
    <div
      aria-hidden="true"
      className="rounded-circle flex items-center justify-center flex-shrink-0"
      style={{ ...box, background: 'color-mix(in srgb, var(--primary) 8%, transparent)' }}
    >
      <span
        className="text-primary"
        style={{ fontWeight: 600, fontSize: Math.max(10, Math.round(size * 0.36)) }}
      >
        {(name || '?').charAt(0).toUpperCase()}
      </span>
    </div>
  );
}
