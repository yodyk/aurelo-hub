// ── Storage API — Supabase Storage for avatars, logos, client files ──
import { supabase } from '@/integrations/supabase/client';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

// ── Helpers ─────────────────────────────────────────────────────────

function publicUrl(bucket: string, path: string): string {
  return `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${path}`;
}

function authedUrl(bucket: string, path: string): string {
  return `${SUPABASE_URL}/storage/v1/object/authenticated/${bucket}/${path}`;
}

// ── Avatars ─────────────────────────────────────────────────────────

export async function uploadAvatar(workspaceId: string, file: File): Promise<string> {
  const ext = file.name.split('.').pop() || 'png';
  const path = `${workspaceId}/avatar.${ext}`;
  const { error } = await supabase.storage.from('avatars').upload(path, file, { upsert: true });
  if (error) throw new Error(`Failed to upload avatar: ${error.message}`);
  return publicUrl('avatars', path);
}

export async function getAvatarUrl(workspaceId: string): Promise<string | null> {
  const { data } = await supabase.storage.from('avatars').list(workspaceId, { limit: 1, search: 'avatar' });
  if (!data || data.length === 0) return null;
  return publicUrl('avatars', `${workspaceId}/${data[0].name}`);
}

export async function deleteAvatar(workspaceId: string): Promise<void> {
  const { data } = await supabase.storage.from('avatars').list(workspaceId, { limit: 1, search: 'avatar' });
  if (data && data.length > 0) {
    await supabase.storage.from('avatars').remove([`${workspaceId}/${data[0].name}`]);
  }
}

// ── Logos ────────────────────────────────────────────────────────────

export async function uploadLogo(workspaceId: string, type: 'app' | 'email', file: File): Promise<string> {
  const ext = file.name.split('.').pop() || 'png';
  const path = `${workspaceId}/${type}.${ext}`;
  const { error } = await supabase.storage.from('logos').upload(path, file, { upsert: true });
  if (error) throw new Error(`Failed to upload logo: ${error.message}`);
  return publicUrl('logos', path);
}

export async function getLogoUrls(workspaceId: string): Promise<{ app: string | null; email: string | null }> {
  const { data } = await supabase.storage.from('logos').list(workspaceId, { limit: 10 });
  const result: { app: string | null; email: string | null } = { app: null, email: null };
  if (!data) return result;
  for (const file of data) {
    if (file.name.startsWith('app.')) result.app = publicUrl('logos', `${workspaceId}/${file.name}`);
    if (file.name.startsWith('email.')) result.email = publicUrl('logos', `${workspaceId}/${file.name}`);
  }
  return result;
}

export async function deleteLogo(workspaceId: string, type: 'app' | 'email'): Promise<void> {
  const { data } = await supabase.storage.from('logos').list(workspaceId, { limit: 10 });
  if (!data) return;
  const match = data.find(f => f.name.startsWith(`${type}.`));
  if (match) {
    await supabase.storage.from('logos').remove([`${workspaceId}/${match.name}`]);
  }
}

// ── Client Files ────────────────────────────────────────────────────

export interface StoredFile {
  name: string;
  size: number;
  url: string;
  createdAt: string;
}

export async function loadFiles(workspaceId: string, clientId: string): Promise<StoredFile[]> {
  const folder = `${workspaceId}/client-${clientId}`;
  const { data, error } = await supabase.storage.from('client-files').list(folder, { limit: 200, sortBy: { column: 'created_at', order: 'desc' } });
  if (error) { console.error('[storageApi] loadFiles:', error); return []; }
  return (data || []).map(f => ({
    name: f.name,
    size: f.metadata?.size || 0,
    url: authedUrl('client-files', `${folder}/${f.name}`),
    createdAt: f.created_at,
  }));
}

export async function uploadFile(workspaceId: string, clientId: string, file: File): Promise<StoredFile> {
  const folder = `${workspaceId}/client-${clientId}`;
  const ts = Date.now();
  const path = `${folder}/${ts}-${file.name}`;
  const { error } = await supabase.storage.from('client-files').upload(path, file);
  if (error) throw new Error(`Failed to upload file: ${error.message}`);
  return {
    name: file.name,
    size: file.size,
    url: authedUrl('client-files', path),
    createdAt: new Date().toISOString(),
  };
}

export async function deleteFile(workspaceId: string, clientId: string, fileName: string): Promise<void> {
  const folder = `${workspaceId}/client-${clientId}`;
  // List to find exact file (may have timestamp prefix)
  const { data } = await supabase.storage.from('client-files').list(folder, { limit: 200 });
  const match = data?.find(f => f.name === fileName || f.name.endsWith(`-${fileName}`));
  if (match) {
    const { error } = await supabase.storage.from('client-files').remove([`${folder}/${match.name}`]);
    if (error) throw new Error(`Failed to delete file: ${error.message}`);
  }
}

export async function getSignedUrl(workspaceId: string, clientId: string, fileName: string): Promise<string | null> {
  const folder = `${workspaceId}/client-${clientId}`;
  const { data } = await supabase.storage.from('client-files').list(folder, { limit: 200 });
  const match = data?.find(f => f.name === fileName || f.name.endsWith(`-${fileName}`));
  if (!match) return null;
  const { data: signed, error } = await supabase.storage.from('client-files').createSignedUrl(`${folder}/${match.name}`, 3600);
  if (error || !signed) return null;
  return signed.signedUrl;
}
