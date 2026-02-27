import { type PlanId } from './plans';

// Stub — will be replaced with Supabase queries
export async function updatePlan(planId: PlanId): Promise<{
  activatedAt?: string;
  stripeSubscriptionId?: string | null;
  stripeCustomerId?: string | null;
  periodEnd?: string | null;
  isTrial?: boolean;
  trialEnd?: string | null;
}> {
  // Simulate API call
  return {
    activatedAt: new Date().toISOString(),
    stripeSubscriptionId: null,
    stripeCustomerId: null,
    periodEnd: null,
    isTrial: false,
    trialEnd: null,
  };
}

// Generic settings persistence stub
export async function saveSetting(key: string, value: any): Promise<void> {
  // Stub — will be replaced with backend call
  console.log(`[settingsApi] saveSetting: ${key}`, value);
}

export async function loadSetting(key: string): Promise<any> {
  // Stub — will be replaced with backend call
  console.log(`[settingsApi] loadSetting: ${key}`);
  return null;
}

export async function clearDemoData(): Promise<void> {
  console.log('[settingsApi] clearDemoData called');
}

// ── Avatar stubs ────────────────────────────────────────────────────
export async function loadAvatar(): Promise<{ url: string } | null> {
  console.log('[settingsApi] loadAvatar');
  return null;
}

export async function uploadAvatar(file: File): Promise<{ url: string }> {
  console.log('[settingsApi] uploadAvatar', file.name);
  const url = URL.createObjectURL(file);
  return { url };
}

export async function deleteAvatar(): Promise<void> {
  console.log('[settingsApi] deleteAvatar');
}

// ── Logo stubs ──────────────────────────────────────────────────────
export async function loadLogos(): Promise<{
  app: { url: string; fileName: string } | null;
  email: { url: string; fileName: string } | null;
}> {
  console.log('[settingsApi] loadLogos');
  return { app: null, email: null };
}

export async function uploadLogo(file: File, type: 'app' | 'email'): Promise<{ url: string; fileName: string }> {
  console.log('[settingsApi] uploadLogo', type, file.name);
  return { url: URL.createObjectURL(file), fileName: file.name };
}

export async function deleteLogo(type: 'app' | 'email'): Promise<void> {
  console.log('[settingsApi] deleteLogo', type);
}

// ── Team stubs ──────────────────────────────────────────────────────
export async function inviteTeamMember(email: string, role: string): Promise<any> {
  console.log('[settingsApi] inviteTeamMember', email, role);
  return { id: crypto.randomUUID(), email, role, status: 'invited', joinedAt: new Date().toISOString() };
}

export async function removeTeamMember(id: string): Promise<void> {
  console.log('[settingsApi] removeTeamMember', id);
}

// ── API key stub ────────────────────────────────────────────────────
export async function regenerateApiKey(): Promise<string> {
  console.log('[settingsApi] regenerateApiKey');
  return `ak_${crypto.randomUUID().replace(/-/g, '')}`;
}

// ── Data / danger zone stubs ────────────────────────────────────────
export async function exportData(type: string): Promise<void> {
  console.log('[settingsApi] exportData', type);
}

export async function resetFinancialData(): Promise<void> {
  console.log('[settingsApi] resetFinancialData');
}

export async function deleteWorkspace(): Promise<void> {
  console.log('[settingsApi] deleteWorkspace');
}

export async function seedDemoData(): Promise<{ summary?: { clients?: number; sessions?: number; projects?: number } }> {
  console.log('[settingsApi] seedDemoData');
  return { summary: { clients: 9, sessions: 200, projects: 20 } };
}
