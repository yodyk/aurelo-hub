import RichEditor from './editor/RichEditor';
import SaveIndicator from './editor/SaveIndicator';
import { useAutosave } from './editor/useAutosave';

interface Props {
  value: string;
  onSave: (html: string | null) => void;
  placeholder?: string;
  taskId?: string;
}

/**
 * Task description surface. Delegates to the canonical `RichEditor`
 * primitive and layers the shared autosave contract on top.
 */
export default function RichDescriptionEditor({ value, onSave, placeholder, taskId }: Props) {
  const autosave = useAutosave({
    recordId: taskId,
    onSave: async (html) => { onSave(html); },
  });

  return (
    <div>
      <RichEditor
        variant="task"
        recordId={taskId}
        value={value}
        placeholder={placeholder}
        onChange={autosave.schedule}
        onBlur={() => { void autosave.flush(); }}
      />
      <SaveIndicator state={autosave.state} onRetry={() => { void autosave.retry(); }} />
    </div>
  );
}
