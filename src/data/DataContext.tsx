import { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo, type ReactNode } from 'react';
import * as api from './dataApi';
import * as settingsApi from './settingsApi';
import { useAuth } from './AuthContext';
import { type IdentityType, type WorkCategory, getCategoriesForIdentity, getCategoryNames } from './identityPresets';
import { computeInsightsMetrics, type InsightsMetrics } from './insightsMetrics';

export interface FinancialDefaults {
  taxRate: number;
  processingFeeRate: number;
  costRate: number;
  currency: string;
  weeklyTarget: number;
}

interface DataContextType {
  clients: any[];
  sessions: any[];
  loading: boolean;
  financialDefaults: FinancialDefaults;
  netMultiplier: number;
  identity: IdentityType | null;
  identityLoaded: boolean;
  workCategories: WorkCategory[];
  workCategoryNames: string[];
  setIdentityAndCategories: (identity: IdentityType, categories: WorkCategory[]) => Promise<void>;
  updateWorkCategories: (categories: WorkCategory[]) => Promise<void>;
  addClient: (client: any) => Promise<any>;
  updateClient: (clientId: string, updates: any) => Promise<void>;
  addSession: (session: any) => Promise<any>;
  getProjects: (clientId: string) => any[];
  loadProjectsForClient: (clientId: string) => Promise<any[]>;
  addProject: (clientId: string, project: any) => Promise<any>;
  updateProject: (clientId: string, projectId: string, updates: any) => Promise<void>;
  allProjects: any[];
  loadAllProjects: () => Promise<void>;
  initAvatar: { url: string; fileName: string } | null;
  initLogos: { app: any; email: any };
  initSettings: Record<string, any>;
  initPlan: any;
  refresh: () => Promise<void>;
  insightsMetrics: InsightsMetrics;
}

const DEFAULT_FINANCIALS: FinancialDefaults = {
  taxRate: 0.25,
  processingFeeRate: 0.029,
  costRate: 45,
  currency: 'USD',
  weeklyTarget: 40,
};

const FALLBACK_CATEGORIES: WorkCategory[] = [
  { name: 'Design', billable: true, isDefault: true },
  { name: 'Development', billable: true, isDefault: true },
  { name: 'Meetings', billable: true, isDefault: true },
  { name: 'Strategy', billable: true, isDefault: true },
  { name: 'Prospecting', billable: false, isDefault: true },
];

const DataContext = createContext<DataContextType | null>(null);

const safeDefaults: DataContextType = {
  clients: [], sessions: [], loading: true,
  financialDefaults: DEFAULT_FINANCIALS,
  netMultiplier: 1 - DEFAULT_FINANCIALS.taxRate - DEFAULT_FINANCIALS.processingFeeRate,
  identity: null, identityLoaded: false,
  workCategories: FALLBACK_CATEGORIES,
  workCategoryNames: getCategoryNames(FALLBACK_CATEGORIES),
  setIdentityAndCategories: async () => {},
  updateWorkCategories: async () => {},
  addClient: async () => ({}),
  updateClient: async () => {},
  addSession: async () => ({}),
  getProjects: () => [],
  loadProjectsForClient: async () => [],
  addProject: async () => ({}),
  updateProject: async () => {},
  allProjects: [],
  loadAllProjects: async () => {},
  initAvatar: null,
  initLogos: { app: null, email: null },
  initSettings: {},
  initPlan: null,
  refresh: async () => {},
  insightsMetrics: computeInsightsMetrics([], [], 1 - DEFAULT_FINANCIALS.taxRate - DEFAULT_FINANCIALS.processingFeeRate),
};

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) return safeDefaults;
  return ctx;
}

export function DataProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [clients, setClients] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [projectsCache, setProjectsCache] = useState<Record<string, any[]>>({});
  const [allProjects, setAllProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [identity, setIdentity] = useState<IdentityType | null>(null);
  const [identityLoaded, setIdentityLoaded] = useState(false);
  const [workCategories, setWorkCategories] = useState<WorkCategory[]>(FALLBACK_CATEGORIES);
  const workCategoryNames = getCategoryNames(workCategories);
  const [financialDefaults, setFinancialDefaults] = useState<FinancialDefaults>(DEFAULT_FINANCIALS);
  const [netMultiplier, setNetMultiplier] = useState(1 - DEFAULT_FINANCIALS.taxRate - DEFAULT_FINANCIALS.processingFeeRate);
  const [initAvatar, setInitAvatar] = useState<{ url: string; fileName: string } | null>(null);
  const [initLogos, setInitLogos] = useState<{ app: any; email: any }>({ app: null, email: null });
  const [initSettings, setInitSettings] = useState<Record<string, any>>({});
  const [initPlan, setInitPlan] = useState<any>(null);

  const clientsRef = useRef(clients);
  clientsRef.current = clients;
  const projectsCacheRef = useRef(projectsCache);
  projectsCacheRef.current = projectsCache;

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setClients([]); setSessions([]); setProjectsCache({}); setAllProjects([]);
      setIdentity(null); setIdentityLoaded(false); setWorkCategories(FALLBACK_CATEGORIES);
      setFinancialDefaults(DEFAULT_FINANCIALS);
      setNetMultiplier(1 - DEFAULT_FINANCIALS.taxRate - DEFAULT_FINANCIALS.processingFeeRate);
      setInitAvatar(null); setInitLogos({ app: null, email: null }); setInitSettings({}); setInitPlan(null);
      setLoading(false);
      return;
    }

    let mounted = true;
    setLoading(true);
    setClients([]); setSessions([]); setProjectsCache({}); setAllProjects([]);
    setIdentity(null); setIdentityLoaded(false);

    api.loadInitData()
      .then(initData => {
        if (!mounted || !initData) return;
        setClients(initData.clients || []);
        setSessions(initData.sessions || []);
        setInitAvatar(initData.avatar || null);
        setInitLogos(initData.logos || { app: null, email: null });
        setInitSettings(initData.settings || {});
        setInitPlan(initData.plan || null);

        const raw = initData.settings?.financial;
        if (raw) {
          const parsed: FinancialDefaults = {
            taxRate: raw.taxRate ? parseFloat(raw.taxRate) / 100 : DEFAULT_FINANCIALS.taxRate,
            processingFeeRate: raw.processingFee ? parseFloat(raw.processingFee) / 100 : DEFAULT_FINANCIALS.processingFeeRate,
            costRate: raw.costRate ? parseFloat(raw.costRate) : DEFAULT_FINANCIALS.costRate,
            currency: raw.currency || DEFAULT_FINANCIALS.currency,
            weeklyTarget: raw.weeklyTarget ? parseFloat(raw.weeklyTarget) : DEFAULT_FINANCIALS.weeklyTarget,
          };
          setFinancialDefaults(parsed);
          setNetMultiplier(1 - parsed.taxRate - parsed.processingFeeRate);
        }

        const identityData = initData.settings?.identity;
        const categoriesData = initData.settings?.categories;
        if (identityData?.type) setIdentity(identityData.type as IdentityType);
        if (categoriesData && Array.isArray(categoriesData) && categoriesData.length > 0) {
          setWorkCategories(categoriesData);
        } else if (identityData?.type) {
          setWorkCategories(getCategoriesForIdentity(identityData.type as IdentityType));
        }
        setIdentityLoaded(true);
      })
      .catch(err => {
        console.error('[DataContext] Failed to load init data:', err);
        if (mounted) setIdentityLoaded(true);
      })
      .finally(() => { if (mounted) setLoading(false); });

    return () => { mounted = false; };
  }, [user?.id, authLoading]);

  const refresh = useCallback(async () => {
    const [cl, se] = await Promise.all([api.loadClients(), api.loadSessions()]);
    setClients(cl?.length ? cl : []);
    setSessions(se?.length ? se : []);
  }, []);

  const handleAddClient = useCallback(async (client: any) => {
    const saved = await api.addClient(client);
    setClients(prev => [...prev, saved]);
    return saved;
  }, []);

  const handleUpdateClient = useCallback(async (clientId: string, updates: any) => {
    await api.updateClient(clientId, updates);
    setClients(prev => prev.map(c => c.id === clientId ? { ...c, ...updates } : c));
  }, []);

  const getProjectsForClient = useCallback((clientId: string) => projectsCacheRef.current[clientId] || [], []);

  const handleAddSession = useCallback(async (session: any) => {
    const saved = await api.addSession(session);
    setSessions(prev => [saved, ...prev]);
    const cid = session.clientId;
    if (!cid) return saved;
    try {
      if (session.allocationType === 'project' && session.projectId) {
        const projects = getProjectsForClient(cid);
        const pid = String(session.projectId);
        const idx = projects.findIndex((p: any) => String(p.id) === pid);
        if (idx !== -1) {
          const updated = projects.map((p: any, i: number) => i !== idx ? p : { ...p, hours: (p.hours || 0) + (session.duration || 0), revenue: (p.revenue || 0) + (session.revenue || 0) });
          await api.saveProjects(cid, updated);
          setProjectsCache(prev => ({ ...prev, [cid]: updated }));
        }
      }
      if (session.allocationType === 'retainer' && session.billable) {
        const client = clientsRef.current.find((c: any) => c.id === cid);
        if (client && client.model === 'Retainer') {
          const newRemaining = Math.max(0, (client.retainerRemaining || 0) - (session.duration || 0));
          await api.updateClient(cid, { retainerRemaining: newRemaining });
          setClients(prev => prev.map(c => c.id === cid ? { ...c, retainerRemaining: newRemaining } : c));
        }
      }
    } catch (err) {
      console.error('Session side-effect error (non-fatal):', err);
    }
    return saved;
  }, [getProjectsForClient]);

  const getProjects = useCallback((clientId: string) => projectsCacheRef.current[clientId] || [], []);

  const loadProjectsForClient = useCallback(async (clientId: string) => {
    const remote = await api.loadProjects(clientId);
    const result = remote?.length ? remote : [];
    setProjectsCache(prev => ({ ...prev, [clientId]: result }));
    return result;
  }, []);

  const handleAddProject = useCallback(async (clientId: string, project: any) => {
    const saved = await api.addProject(clientId, project);
    setProjectsCache(prev => ({ ...prev, [clientId]: [...(prev[clientId] || []), saved] }));
    setAllProjects(prev => prev.length > 0 ? [...prev, { ...saved, clientId }] : prev);
    return saved;
  }, []);

  const handleUpdateProject = useCallback(async (clientId: string, projectId: string, updates: any) => {
    await api.updateProject(clientId, projectId, updates);
    setProjectsCache(prev => ({ ...prev, [clientId]: prev[clientId]?.map((p: any) => String(p.id) === String(projectId) ? { ...p, ...updates } : p) || [] }));
    setAllProjects(prev => prev.map(p => String(p.id) === String(projectId) && p.clientId === clientId ? { ...p, ...updates } : p));
  }, []);

  const loadAllProjects = useCallback(async () => {
    const remote = await api.loadAllProjects();
    setAllProjects(remote);
  }, []);

  const handleSetIdentityAndCategories = useCallback(async (newIdentity: IdentityType, categories: WorkCategory[]) => {
    setIdentity(newIdentity); setWorkCategories(categories);
    await Promise.all([settingsApi.saveSetting('identity', { type: newIdentity }), settingsApi.saveSetting('categories', categories)]);
  }, []);

  const handleUpdateWorkCategories = useCallback(async (categories: WorkCategory[]) => {
    setWorkCategories(categories);
    await settingsApi.saveSetting('categories', categories);
  }, []);

  const insightsMetrics = useMemo(() => computeInsightsMetrics(sessions, clients, netMultiplier), [sessions, clients, netMultiplier]);

  return (
    <DataContext.Provider value={{
      clients, sessions, loading, financialDefaults, netMultiplier,
      identity, identityLoaded, workCategories, workCategoryNames,
      setIdentityAndCategories: handleSetIdentityAndCategories,
      updateWorkCategories: handleUpdateWorkCategories,
      addClient: handleAddClient, updateClient: handleUpdateClient,
      addSession: handleAddSession,
      getProjects, loadProjectsForClient,
      addProject: handleAddProject, updateProject: handleUpdateProject,
      allProjects, loadAllProjects,
      initAvatar, initLogos, initSettings, initPlan,
      refresh, insightsMetrics,
    }}>
      {children}
    </DataContext.Provider>
  );
}
