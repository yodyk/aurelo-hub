// ── Notes API stub ──────────────────────────────────────────────────
// Will be replaced with Supabase queries

export type NoteType = 'general' | 'meeting' | 'decision' | 'action-item' | 'feedback';

export interface ClientNote {
  id: string;
  clientId: string;
  content: string;
  type: NoteType;
  tags: string[];
  projectId?: string;
  projectName?: string;
  isPinned: boolean;
  isResolved: boolean;
  createdAt: string;
  updatedAt: string;
}

let noteIdCounter = 100;

export async function loadNotes(_clientId: string): Promise<ClientNote[]> {
  return [];
}

export async function addNote(_clientId: string, note: Partial<ClientNote>): Promise<ClientNote> {
  const now = new Date().toISOString();
  return {
    id: String(++noteIdCounter),
    clientId: _clientId,
    content: note.content || '',
    type: note.type || 'general',
    tags: note.tags || [],
    projectId: note.projectId,
    projectName: note.projectName,
    isPinned: note.isPinned || false,
    isResolved: note.isResolved || false,
    createdAt: now,
    updatedAt: now,
  };
}

export async function updateNote(_clientId: string, _noteId: string, updates: Partial<ClientNote>): Promise<Partial<ClientNote>> {
  return { ...updates, updatedAt: new Date().toISOString() };
}

export async function deleteNote(_clientId: string, _noteId: string): Promise<void> {
  // stub
}
