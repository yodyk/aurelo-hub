import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

interface Client {
  id: string;
  name: string;
  status: 'Active' | 'Prospect' | 'Archived';
  model: 'Hourly' | 'Retainer' | 'Project';
  rate: number;
  monthlyEarnings: number;
  lifetimeRevenue: number;
  hoursLogged: number;
  retainerRemaining: number;
  retainerTotal: number;
  trueHourlyRate: number;
  contactName: string;
  contactEmail: string;
  website: string;
  showPortalCosts: boolean;
  lastSessionDate: string | null;
  externalLinks?: { label: string; url: string }[];
}

interface Session {
  id: string | number;
  clientId: string;
  client: string;
  projectId?: string;
  date: string;
  task: string;
  duration: number;
  revenue: number;
  billable: boolean;
  workTags: string[];
  allocationType?: 'project' | 'retainer' | 'general';
}

interface Project {
  id: string | number;
  clientId: string;
  name: string;
  status: 'Not Started' | 'In Progress' | 'On Hold' | 'Complete';
  hours: number;
  estimatedHours: number;
  revenue: number;
  totalValue: number;
  startDate?: string;
  endDate?: string;
  description?: string;
}

interface DataContextValue {
  clients: Client[];
  sessions: Session[];
  allProjects: Project[];
  workCategories: any[];
  workCategoryNames: string[];
  financialDefaults: {
    taxRate: number;
    processingFeeRate: number;
    costRate: number;
    currency: string;
    weeklyTarget: number;
  };
  identity: string | null;
  setClients: (clients: Client[]) => void;
  setSessions: (sessions: Session[]) => void;
  getProjects: (clientId: string) => Project[];
  loadProjectsForClient: (clientId: string) => Promise<Project[]>;
  refresh: () => Promise<void>;
}

const DataContext = createContext<DataContextValue | null>(null);

// Sample data for UI development
const sampleClients: Client[] = [
  { id: '1', name: 'Arcadia Design', status: 'Active', model: 'Hourly', rate: 150, monthlyEarnings: 3200, lifetimeRevenue: 18400, hoursLogged: 21, retainerRemaining: 0, retainerTotal: 0, trueHourlyRate: 152, contactName: 'Sarah Chen', contactEmail: 'sarah@arcadia.co', website: 'arcadia.co', showPortalCosts: true, lastSessionDate: '2026-02-26' },
  { id: '2', name: 'Meridian Labs', status: 'Active', model: 'Retainer', rate: 4500, monthlyEarnings: 2400, lifetimeRevenue: 32000, hoursLogged: 16, retainerRemaining: 3060, retainerTotal: 4500, trueHourlyRate: 150, contactName: 'Jake Morrison', contactEmail: 'jake@meridian.io', website: 'meridian.io', showPortalCosts: true, lastSessionDate: '2026-02-26' },
  { id: '3', name: 'Beacon Studio', status: 'Active', model: 'Project', rate: 8000, monthlyEarnings: 1800, lifetimeRevenue: 12600, hoursLogged: 12, retainerRemaining: 0, retainerTotal: 0, trueHourlyRate: 150, contactName: 'Emily Park', contactEmail: 'emily@beacon.studio', website: 'beacon.studio', showPortalCosts: false, lastSessionDate: '2026-02-25' },
  { id: '4', name: 'Novatech', status: 'Prospect', model: 'Hourly', rate: 125, monthlyEarnings: 0, lifetimeRevenue: 0, hoursLogged: 0, retainerRemaining: 0, retainerTotal: 0, trueHourlyRate: 0, contactName: 'David Kim', contactEmail: 'david@novatech.com', website: '', showPortalCosts: true, lastSessionDate: null },
  { id: '5', name: 'Vertex Creative', status: 'Archived', model: 'Hourly', rate: 130, monthlyEarnings: 0, lifetimeRevenue: 8500, hoursLogged: 45, retainerRemaining: 0, retainerTotal: 0, trueHourlyRate: 130, contactName: 'Lisa Wong', contactEmail: 'lisa@vertex.co', website: '', showPortalCosts: true, lastSessionDate: null },
];

const sampleSessions: Session[] = [
  { id: 1, clientId: '1', client: 'Arcadia Design', projectId: 'p1', date: '2026-02-26', task: 'Brand guidelines v2', duration: 3.5, revenue: 525, billable: true, workTags: ['Design', 'Branding'] },
  { id: 2, clientId: '2', client: 'Meridian Labs', projectId: 'p2', date: '2026-02-26', task: 'Dashboard wireframes', duration: 2.0, revenue: 300, billable: true, workTags: ['UX', 'Design'] },
  { id: 3, clientId: '3', client: 'Beacon Studio', projectId: 'p3', date: '2026-02-25', task: 'Client presentation', duration: 1.5, revenue: 225, billable: true, workTags: ['Meetings'] },
  { id: 4, clientId: '1', client: 'Arcadia Design', projectId: 'p1', date: '2026-02-25', task: 'Logo explorations', duration: 4.0, revenue: 600, billable: true, workTags: ['Design'] },
  { id: 5, clientId: '2', client: 'Meridian Labs', projectId: 'p2', date: '2026-02-24', task: 'Internal sync meeting', duration: 0.5, revenue: 0, billable: false, workTags: ['Admin'] },
];

const sampleProjects: Project[] = [
  { id: 'p1', clientId: '1', name: 'Brand Refresh', status: 'In Progress', hours: 14, estimatedHours: 30, revenue: 2100, totalValue: 4500, startDate: '2026-01-15' },
  { id: 'p2', clientId: '2', name: 'Dashboard Redesign', status: 'In Progress', hours: 8, estimatedHours: 20, revenue: 1200, totalValue: 3000, startDate: '2026-02-01' },
  { id: 'p3', clientId: '3', name: 'Website Launch', status: 'In Progress', hours: 12, estimatedHours: 40, revenue: 1800, totalValue: 8000, startDate: '2026-01-20' },
  { id: 'p4', clientId: '1', name: 'Logo Package', status: 'Complete', hours: 10, estimatedHours: 10, revenue: 1500, totalValue: 1500, startDate: '2025-12-01', endDate: '2026-01-10' },
];

const defaultCategories = ['Design', 'Development', 'Meetings', 'Strategy', 'Admin', 'Prospecting'];

export function DataProvider({ children }: { children: ReactNode }) {
  const [clients, setClients] = useState<Client[]>(sampleClients);
  const [sessions, setSessions] = useState<Session[]>(sampleSessions);
  const [projects] = useState<Project[]>(sampleProjects);

  const refresh = async () => {
    // Will be replaced with backend queries
  };

  const getProjects = useCallback((clientId: string): Project[] => {
    return projects.filter(p => p.clientId === clientId);
  }, [projects]);

  const loadProjectsForClient = useCallback(async (clientId: string): Promise<Project[]> => {
    // Stub — returns cached data; will be replaced with API call
    return projects.filter(p => p.clientId === clientId);
  }, [projects]);

  return (
    <DataContext.Provider value={{
      clients,
      sessions,
      allProjects: projects,
      workCategories: defaultCategories.map((name, i) => ({ id: String(i), name })),
      workCategoryNames: defaultCategories,
      financialDefaults: {
        taxRate: 0.25,
        processingFeeRate: 0.029,
        costRate: 45,
        currency: 'USD',
        weeklyTarget: 40,
      },
      identity: null,
      setClients,
      setSessions,
      getProjects,
      loadProjectsForClient,
      refresh,
    }}>
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used within DataProvider');
  return ctx;
}
