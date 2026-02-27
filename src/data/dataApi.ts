// ── Data API stub ───────────────────────────────────────────────────
// Local-only stubs returning sample data. Will be replaced with
// Supabase/Cloud calls when backend is enabled.

const sampleClients = [
  { id: '1', name: 'Arcadia Design', status: 'Active', model: 'Hourly', rate: 150, monthlyEarnings: 3200, lifetimeRevenue: 18400, hoursLogged: 21, retainerRemaining: 0, retainerTotal: 0, trueHourlyRate: 152, contactName: 'Sarah Chen', contactEmail: 'sarah@arcadia.co', website: 'arcadia.co', showPortalCosts: true, lastSessionDate: '2026-02-26' },
  { id: '2', name: 'Meridian Labs', status: 'Active', model: 'Retainer', rate: 150, monthlyEarnings: 2400, lifetimeRevenue: 32000, hoursLogged: 16, retainerRemaining: 24, retainerTotal: 40, trueHourlyRate: 150, contactName: 'Jake Morrison', contactEmail: 'jake@meridian.io', website: 'meridian.io', showPortalCosts: true, lastSessionDate: '2026-02-26' },
  { id: '3', name: 'Beacon Studio', status: 'Active', model: 'Project', rate: 150, monthlyEarnings: 1800, lifetimeRevenue: 12600, hoursLogged: 12, retainerRemaining: 0, retainerTotal: 0, trueHourlyRate: 150, contactName: 'Emily Park', contactEmail: 'emily@beacon.studio', website: 'beacon.studio', showPortalCosts: false, lastSessionDate: '2026-02-25' },
  { id: '4', name: 'Novatech', status: 'Prospect', model: 'Hourly', rate: 125, monthlyEarnings: 0, lifetimeRevenue: 0, hoursLogged: 0, retainerRemaining: 0, retainerTotal: 0, trueHourlyRate: 0, contactName: 'David Kim', contactEmail: 'david@novatech.com', website: '', showPortalCosts: true, lastSessionDate: null },
];

const sampleSessions = [
  { id: '1', clientId: '1', client: 'Arcadia Design', projectId: 'p1', date: 'Feb 26, 2026', dateGroup: 'Today', task: 'Brand guidelines v2', duration: 3.5, revenue: 525, billable: true, workTags: ['Design', 'Branding'], allocationType: 'project' },
  { id: '2', clientId: '2', client: 'Meridian Labs', projectId: 'p2', date: 'Feb 26, 2026', dateGroup: 'Today', task: 'Dashboard wireframes', duration: 2.0, revenue: 300, billable: true, workTags: ['Design'], allocationType: 'retainer' },
  { id: '3', clientId: '3', client: 'Beacon Studio', projectId: 'p3', date: 'Feb 25, 2026', dateGroup: 'Yesterday', task: 'Client presentation', duration: 1.5, revenue: 225, billable: true, workTags: ['Meetings'], allocationType: 'project' },
  { id: '4', clientId: '1', client: 'Arcadia Design', projectId: 'p1', date: 'Feb 25, 2026', dateGroup: 'Yesterday', task: 'Logo explorations', duration: 4.0, revenue: 600, billable: true, workTags: ['Design'], allocationType: 'project' },
  { id: '5', clientId: '2', client: 'Meridian Labs', date: 'Feb 24, 2026', dateGroup: 'This week', task: 'Internal sync meeting', duration: 0.5, revenue: 0, billable: false, workTags: ['Admin'], allocationType: 'general' },
];

const sampleProjects: Record<string, any[]> = {
  '1': [
    { id: 'p1', clientId: '1', name: 'Brand Refresh', status: 'In Progress', hours: 14, estimatedHours: 30, revenue: 2100, totalValue: 4500, startDate: '2026-01-15' },
    { id: 'p4', clientId: '1', name: 'Logo Package', status: 'Complete', hours: 10, estimatedHours: 10, revenue: 1500, totalValue: 1500, startDate: '2025-12-01', endDate: '2026-01-10' },
  ],
  '2': [
    { id: 'p2', clientId: '2', name: 'Dashboard Redesign', status: 'In Progress', hours: 8, estimatedHours: 20, revenue: 1200, totalValue: 3000, startDate: '2026-02-01' },
  ],
  '3': [
    { id: 'p3', clientId: '3', name: 'Website Launch', status: 'In Progress', hours: 12, estimatedHours: 40, revenue: 1800, totalValue: 8000, startDate: '2026-01-20' },
  ],
};

// Simulates the /init bulk endpoint
export async function loadInitData() {
  return {
    clients: [...sampleClients],
    sessions: [...sampleSessions],
    avatar: null,
    logos: { app: null, email: null },
    settings: {
      financial: { taxRate: '25', processingFee: '2.9', costRate: '45', currency: 'USD', weeklyTarget: '40' },
      identity: { type: 'designer' },
      categories: null,
    },
    plan: { planId: 'starter', activatedAt: new Date().toISOString(), isTrial: false, trialEnd: null },
  };
}

export async function loadClients() { return [...sampleClients]; }
export async function loadSessions() { return [...sampleSessions]; }

export async function addClient(client: any) {
  return { ...client, id: 'c' + Date.now() };
}

export async function updateClient(clientId: string, updates: any) {
  // stub
}

export async function addSession(session: any) {
  return { ...session, id: 's' + Date.now() };
}

export async function loadProjects(clientId: string) {
  return sampleProjects[clientId] ? [...sampleProjects[clientId]] : [];
}

export async function saveProjects(clientId: string, projects: any[]) {
  sampleProjects[clientId] = projects;
}

export async function addProject(clientId: string, project: any) {
  const saved = { ...project, id: 'p' + Date.now(), clientId };
  if (!sampleProjects[clientId]) sampleProjects[clientId] = [];
  sampleProjects[clientId].push(saved);
  return saved;
}

export async function updateProject(clientId: string, projectId: string, updates: any) {
  const projects = sampleProjects[clientId] || [];
  const idx = projects.findIndex(p => String(p.id) === String(projectId));
  if (idx !== -1) projects[idx] = { ...projects[idx], ...updates };
}

export async function loadAllProjects() {
  return Object.values(sampleProjects).flat();
}

export async function loadFiles(_clientId: string) {
  return [] as any[];
}

export async function uploadFile(_clientId: string, _file: File) {
  return { name: _file.name, size: _file.size, url: URL.createObjectURL(_file), createdAt: new Date().toISOString() };
}

export async function deleteFile(_clientId: string, _fileName: string) {
  // stub
}
