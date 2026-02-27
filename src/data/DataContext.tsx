import { createContext, useContext, useState, type ReactNode } from 'react';

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

interface DataContextValue {
  clients: Client[];
  sessions: Session[];
  allProjects: any[];
  workCategories: any[];
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

export function DataProvider({ children }: { children: ReactNode }) {
  const [clients, setClients] = useState<Client[]>(sampleClients);
  const [sessions, setSessions] = useState<Session[]>(sampleSessions);

  const refresh = async () => {
    // Will be replaced with Supabase queries
  };

  return (
    <DataContext.Provider value={{
      clients,
      sessions,
      allProjects: [],
      workCategories: [],
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
