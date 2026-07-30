import RichEditor from './editor/RichEditor';

interface NoteEditorProps {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
}

/**
 * Compatibility adapter. All rich text now flows through the canonical
 * `RichEditor` primitive; this thin wrapper preserves the older prop shape
 * for existing call sites.
 */
export default function NoteEditor({ content, onChange, placeholder, autoFocus }: NoteEditorProps) {
  return (
    <RichEditor
      variant="note"
      value={content}
      placeholder={placeholder}
      autoFocus={autoFocus}
      onChange={(html) => onChange(html ?? '')}
    />
  );
}
