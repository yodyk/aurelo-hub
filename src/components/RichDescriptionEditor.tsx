import { useEffect, useRef, useState } from 'react';
import NoteEditor from './NoteEditor';

interface Props {
  value: string;
  onSave: (html: string | null) => void;
  placeholder?: string;
  taskId?: string;
}

/**
 * Rich-text description editor. Wraps NoteEditor with debounced autosave.
 * Stored as HTML. Empty content (just `<p></p>`) is persisted as null.
 */
export default function RichDescriptionEditor({ value, onSave, placeholder, taskId }: Props) {
  const [html, setHtml] = useState(value || '');
  const lastSavedRef = useRef<string>(value || '');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reset when switching tasks
  useEffect(() => {
    setHtml(value || '');
    lastSavedRef.current = value || '';
  }, [taskId, value]);

  const handleChange = (next: string) => {
    setHtml(next);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      const normalized = next.replace(/<p><\/p>/g, '').trim();
      const out = normalized ? next : null;
      const prev = lastSavedRef.current;
      if ((out || '') === (prev || '')) return;
      lastSavedRef.current = out || '';
      onSave(out);
    }, 600);
  };

  // Flush on unmount
  useEffect(() => {
    return () => {
      if (timer.current) {
        clearTimeout(timer.current);
        const normalized = html.replace(/<p><\/p>/g, '').trim();
        const out = normalized ? html : null;
        if ((out || '') !== (lastSavedRef.current || '')) {
          lastSavedRef.current = out || '';
          onSave(out);
        }
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="rich-desc-shell bg-accent/30 border border-border rounded-md px-2.5 py-2 focus-within:ring-1 focus-within:ring-primary/30">
      <NoteEditor
        content={html}
        onChange={handleChange}
        placeholder={placeholder || 'Add a note or details for this task…'}
      />
    </div>
  );
}
