// ── Read-only rich content renderer ─────────────────────────────────
// Renders stored editor HTML with the exact same typography as the
// editing surface, so reading and writing never disagree.
import { useMemo } from 'react';
import { normalizeEditorContent, isEditorContentEmpty } from '@/lib/editorContent';

interface Props {
  value: string | null | undefined;
  className?: string;
  /** Rendered when there is no content. */
  fallback?: React.ReactNode;
}

export default function RichContent({ value, className = '', fallback = null }: Props) {
  const html = useMemo(() => normalizeEditorContent(value), [value]);
  if (isEditorContentEmpty(html)) return <>{fallback}</>;
  return (
    <div
      className={`rich-editor-surface is-readonly ${className}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
