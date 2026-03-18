import { clearDemoData } from '../data/settingsApi';
import { useState, useEffect, useRef, useCallback } from 'react';
import { Outlet, NavLink, useLocation, useNavigate, Navigate } from 'react-router';
import { LayoutDashboard, Users, Clock, TrendingUp, Settings, Timer, Square, Menu, X, FolderKanban, LogOut, FileText, Sun, Moon, Lock, PanelLeftClose, PanelLeftOpen, Monitor } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

import { useData, DataProvider } from '../data/DataContext';
import { NotificationCenter } from '../components/NotificationCenter';
import { NotificationEvents } from '../data/notificationsApi';
import { AuthProvider, useAuth } from '../data/AuthContext';
import { PlanProvider, usePlan } from '../data/PlanContext';
// PlanBadge available from '../components/FeatureGate' if needed elsewhere
import { AureloIcon } from '../components/AureloIcon';
import { AureloWordmark } from '../components/AureloWordmark';
import { LogSessionModal } from '../components/Modals';
import { GuidedTour } from '../components/GuidedTour';
import { DemoModeBanner } from '../components/DemoModeBanner';
import { TrialBanner } from '../components/TrialBanner';
import { SidebarUpgradeCTA } from '../components/SidebarUpgradeCTA';
import { WorkspaceSwitcher } from '../components/WorkspaceSwitcher';
import { toast } from 'sonner';
import { useTheme } from '../data/ThemeContext';
import type { FeatureKey } from '../data/plans';
import { useRoleAccess } from '../data/useRoleAccess';

const navItems: { to: string; icon: any; label: string; end?: boolean; feature?: FeatureKey; hideUnlessFeature?: boolean; requiresFinancials?: boolean }[] = [
  { to: '/', icon: LayoutDashboard, label: 'Home', end: true },
  { to: '/clients', icon: Users, label: 'Clients' },
  { to: '/projects', icon: FolderKanban, label: 'Projects' },
  { to: '/time', icon: Clock, label: 'Time' },
  { to: '/insights', icon: TrendingUp, label: 'Insights', requiresFinancials: true },
  { to: '/team', icon: Users, label: 'Team', feature: 'teamUtilization', hideUnlessFeature: true, requiresFinancials: true },
  { to: '/invoicing', icon: FileText, label: 'Invoicing', feature: 'clientInvoicing', requiresFinancials: true },
];

function formatTime(seconds: number) {
  const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
  const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${h}:${m}:${s}`;
}

/* Root wraps AuthProvider → AuthGate → DataProvider → RootLayout */
export default function Root() {
  return (
    <AuthProvider>
      <AuthGate />
    </AuthProvider>
  );
}

/* AuthGate checks if user is authenticated; if not, redirects to /login */
function AuthGate() {
  const { user, loading, workspaceId, isNewUser, clearNewUser, isApproved, signOut } = useAuth();
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fafaf9]">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center gap-3"
        >
          <div className="w-8 h-8 rounded-lg bg-[#5ea1bf]/10 flex items-center justify-center">
            <AureloIcon className="w-4 h-4 text-[#5ea1bf]" />
          </div>
          <div className="w-5 h-5 border-2 border-[#5ea1bf]/20 border-t-[#5ea1bf] rounded-full animate-spin" />
        </motion.div>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  // User exists but has no workspace yet — redirect to onboarding
  if (!workspaceId) return <Navigate to="/onboarding" replace />;

  // Brand new user whose workspace was just auto-provisioned — send to onboarding
  if (isNewUser) {
    clearNewUser();
    return <Navigate to="/onboarding" replace />;
  }

  // Waitlist gate — user not yet approved
  if (!isApproved) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fafaf9] px-6">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="text-center max-w-md"
        >
          <div className="w-14 h-14 rounded-2xl bg-[#5ea1bf]/10 flex items-center justify-center mx-auto mb-6">
            <AureloIcon className="w-7 h-7 text-[#5ea1bf]" />
          </div>
          <h1 className="text-[22px] text-[#1c1c1c] mb-3" style={{ fontWeight: 600, letterSpacing: '-0.01em' }}>
            You're on the waitlist!
          </h1>
          <p className="text-[14px] text-[#717182] leading-relaxed mb-2">
            Thanks for signing up for Aurelo. Your account is pending approval.
          </p>
          <p className="text-[13px] text-[#b0b0b8] mb-8">
            You'll receive an email once your account has been approved. This usually happens within 24 hours.
          </p>
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => window.location.reload()}
              className="px-5 py-2.5 rounded-lg border border-black/10 bg-white text-[#1c1c1c] text-[13px] hover:bg-[#f5f5f5] transition-colors"
              style={{ fontWeight: 500 }}
            >
              Check again
            </button>
            <button
              onClick={async () => {
                await signOut();
                navigate('/login', { replace: true });
              }}
              className="px-5 py-2.5 rounded-lg text-[13px] text-[#717182] hover:text-[#1c1c1c] transition-colors"
              style={{ fontWeight: 500 }}
            >
              Sign out
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <DataProvider>
      <PlanBridge />
    </DataProvider>
  );
}

/** Bridge: reads initPlan from DataContext, passes to PlanProvider */
function PlanBridge() {
  const { initPlan } = useData();
  const { workspaceId, workspaceRole } = useAuth();
  const isOwner = workspaceRole === 'Owner';
  return (
    <PlanProvider initialPlan={initPlan} workspaceId={workspaceId} isOwner={isOwner}>
      <RootLayout />
    </PlanProvider>
  );
}

function RootLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { clients, addSession, initAvatar, initLogos, initSettings } = useData();
  const { user, signOut, workspaceId } = useAuth();
  const { theme, setTheme, resolvedTheme } = useTheme();
  const { can, planId } = usePlan();
  const { canViewFinancials } = useRoleAccess();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  // Timer — persist start timestamp so it survives remounts / midnight
  const [timerRunning, setTimerRunning] = useState(() => {
    return localStorage.getItem('aurelo_timer_start') !== null;
  });
  const [timerSeconds, setTimerSeconds] = useState(() => {
    const stored = localStorage.getItem('aurelo_timer_start');
    if (!stored) return 0;
    return Math.max(0, Math.floor((Date.now() - Number(stored)) / 1000));
  });
  const [showLogModal, setShowLogModal] = useState(false);
  const [stoppedDuration, setStoppedDuration] = useState(0);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const avatarUrl = initAvatar?.url || null;

  const [showTour, setShowTour] = useState(() => {
    return localStorage.getItem('aurelo_tour_active') === 'true';
  });

  const [isDemoMode, setIsDemoMode] = useState(() => {
    return localStorage.getItem('aurelo_demo_mode') === 'true';
  });

  const handleTourComplete = useCallback(() => {
    setShowTour(false);
    localStorage.removeItem('aurelo_tour_active');
    localStorage.setItem('aurelo_tour_completed', 'true');
    navigate('/', { replace: true });
  }, [navigate]);

  const handleRestartTour = useCallback(() => {
    setShowTour(true);
    localStorage.setItem('aurelo_tour_active', 'true');
  }, []);

  const handleClearDemoData = useCallback(async () => {
    await clearDemoData();
    localStorage.removeItem('aurelo_demo_mode');
    localStorage.removeItem('aurelo_tour_active');
    localStorage.removeItem('aurelo_tour_completed');
    setIsDemoMode(false);
    setShowTour(false);
    window.location.href = '/';
  }, []);

  

  const displayName = user?.name || '';
  const displayEmail = user?.email || '';
  const displayInitials = user?.initials || '';

  // Workspace identity for sidebar block — prefer the actual workspace record name from allWorkspaces
  const { allWorkspaces } = useAuth();
  const currentWs = allWorkspaces.find(w => w.id === workspaceId);
  const wsName = currentWs?.name || initSettings?.workspace?.name || '';
  const wsLogoUrl = initLogos?.app?.url || null;
  const wsInitial = wsName ? wsName.charAt(0).toUpperCase() : 'W';

  useEffect(() => {
    if (timerRunning) {
      // Compute elapsed from stored start timestamp each tick
      const tick = () => {
        const stored = localStorage.getItem('aurelo_timer_start');
        if (stored) {
          setTimerSeconds(Math.max(0, Math.floor((Date.now() - Number(stored)) / 1000)));
        }
      };
      tick(); // immediate sync
      timerRef.current = setInterval(tick, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [timerRunning]);

  const handleStartTimer = () => {
    localStorage.setItem('aurelo_timer_start', String(Date.now()));
    setTimerSeconds(0);
    setTimerRunning(true);
  };

  const handleStopTimer = () => {
    const stored = localStorage.getItem('aurelo_timer_start');
    const elapsed = stored ? Math.max(0, Math.floor((Date.now() - Number(stored)) / 1000)) : timerSeconds;
    localStorage.removeItem('aurelo_timer_start');
    setTimerRunning(false);
    setStoppedDuration(elapsed);
    setShowLogModal(true);
  };

  const handleSaveSession = async (session: any) => {
    await addSession(session);
    toast.success('Session logged');
    setTimerSeconds(0);
    // Create notification
    if (workspaceId) {
      try {
        const clientName = clients.find(c => c.id === session.clientId)?.name || 'Client';
        const hours = typeof session.duration === 'number' ? session.duration : 0;
        await NotificationEvents.sessionLogged(workspaceId, clientName, hours, { clientId: session.clientId });
      } catch (err) {
        console.error('[Root] Failed to create session notification:', err);
      }
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/login', { replace: true });
    } catch (err) {
      console.error('Sign out failed:', err);
      toast.error('Failed to sign out');
    }
  };

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Auto-close mobile menu on resize above lg
  useEffect(() => {
    const mql = window.matchMedia('(min-width: 1024px)');
    const handler = () => { if (mql.matches) setMobileMenuOpen(false); };
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);

  // Auto-close mobile menu on navigation
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  const sidebarWidth = sidebarCollapsed ? 'w-[72px]' : 'w-64';
  const mainMargin = sidebarCollapsed ? 'lg:ml-[72px]' : 'lg:ml-64';

  return (
    <div className="min-h-screen flex bg-background">
      {/* Sidebar */}
      <aside className={`${sidebarWidth} border-r border-border bg-card hidden lg:flex flex-col fixed inset-y-0 left-0 z-30 transition-all duration-300`}>
        {/* Logo */}
        <div className={`h-14 flex items-center border-b border-border ${sidebarCollapsed ? 'px-4 justify-center' : 'px-5'}`}>
          {sidebarCollapsed ? (
            <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <AureloIcon className="w-4 h-4 text-primary" />
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="min-w-0"
            >
              <AureloWordmark className="h-[18px] w-auto text-foreground" />
            </motion.div>
          )}
        </div>

        {/* Workspace switcher */}
        <WorkspaceSwitcher
          collapsed={sidebarCollapsed}
          wsName={wsName}
          wsLogoUrl={wsLogoUrl}
          wsInitial={wsInitial}
          planId={planId}
        />
        
        {/* Navigation */}
        <nav className="flex-1 px-3 py-4" data-tour="sidebar-nav">
          <div className="space-y-1">
            {navItems.map((item) => {
              const isLocked = item.feature ? !can(item.feature) : false;
              // Hide nav items that require a feature the user doesn't have
              if (item.hideUnlessFeature && isLocked) return null;
              // Hide financial pages from Members
              if (item.requiresFinancials && !canViewFinancials) return null;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    `group relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-[14px] transition-all duration-200 ${
                      isActive
                        ? 'bg-primary/8 text-primary'
                        : 'text-muted-foreground hover:text-foreground hover:bg-accent/60'
                    }`
                  }
                  style={{ fontWeight: 500 }}
                >
                  {({ isActive }) => (
                    <>
                      {isActive && (
                        <motion.div
                          layoutId="sidebar-indicator"
                          className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-primary rounded-r-full"
                          transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                        />
                      )}
                      <item.icon className={`w-4 h-4 flex-shrink-0 transition-colors duration-200 ${isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'}`} />
                      {!sidebarCollapsed && (
                        <span className="flex-1">{item.label}</span>
                      )}
                      {!sidebarCollapsed && isLocked && (
                        <Lock className="w-3 h-3 text-muted-foreground/50 flex-shrink-0" />
                      )}
                    </>
                  )}
                </NavLink>
              );
            })}
          </div>
        </nav>

        {/* Upgrade CTA for Starter users */}
        <SidebarUpgradeCTA collapsed={sidebarCollapsed} />

        {/* Bottom section */}
        <div className="px-3 py-4 border-t border-border">
          <NavLink
            to="/settings"
            data-tour="settings-link"
            className={({ isActive }) =>
              `w-full flex items-center gap-3 text-left px-3 py-2.5 text-[14px] rounded-lg transition-all duration-200 ${
                isActive
                  ? 'bg-primary/8 text-primary'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent/60'
              }`
            }
            style={{ fontWeight: 500 }}
          >
            <Settings className="w-4 h-4 flex-shrink-0" />
            {!sidebarCollapsed && 'Settings'}
          </NavLink>

          {/* User avatar with menu */}
          <div className="relative" ref={userMenuRef}>
            <button
              onClick={() => setUserMenuOpen(o => !o)}
              className={`mt-3 ${sidebarCollapsed ? 'mx-1' : 'mx-3'} flex items-center gap-3 w-full text-left rounded-lg hover:bg-accent/40 p-1.5 -ml-1.5 transition-colors`}
            >
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 overflow-hidden">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-[12px] text-primary" style={{ fontWeight: 600 }}>{displayInitials}</span>
                )}
              </div>
              {!sidebarCollapsed && (
                <div className="min-w-0">
                  <div className="text-[13px] truncate" style={{ fontWeight: 500 }}>{displayName}</div>
                  <div className="text-[11px] text-muted-foreground truncate">{displayEmail}</div>
                </div>
              )}
            </button>

            <AnimatePresence>
              {userMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 4, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 4, scale: 0.97 }}
                  transition={{ duration: 0.12 }}
                  className="absolute bottom-full left-0 mb-2 w-52 bg-card border border-border rounded-xl overflow-hidden z-50"
                  style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.08), 0 2px 8px rgba(0,0,0,0.04)' }}
                >
                  <div className="px-3 py-2.5 border-b border-border">
                    <div className="text-[13px] truncate" style={{ fontWeight: 500 }}>{displayName}</div>
                    <div className="text-[11px] text-muted-foreground truncate">{displayEmail}</div>
                  </div>
                  <div className="p-1">
                    <button
                      onClick={handleSignOut}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-[13px] text-muted-foreground hover:text-foreground hover:bg-accent/40 rounded-lg transition-colors"
                      style={{ fontWeight: 500 }}
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      Sign out
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Theme switcher */}
          {!sidebarCollapsed ? (
            <div className="mt-3 mx-1 flex items-center rounded-lg bg-accent/40 p-0.5">
              {([
                { value: 'light' as const, icon: Sun, label: 'Light' },
                { value: 'dark' as const, icon: Moon, label: 'Dark' },
                { value: 'system' as const, icon: Monitor, label: 'Auto' },
              ]).map(({ value, icon: ThIcon, label }) => {
                const isActive = theme === value;
                return (
                  <button
                    key={value}
                    onClick={() => setTheme(value)}
                    className={`relative flex items-center justify-center gap-1 py-1.5 rounded-md text-[11px] transition-all duration-200 ${
                      isActive
                        ? 'bg-card text-foreground shadow-sm flex-[1.6]'
                        : 'text-muted-foreground hover:text-foreground flex-1'
                    }`}
                    style={{ fontWeight: isActive ? 600 : 400 }}
                    title={label}
                  >
                    <ThIcon className="w-3 h-3 flex-shrink-0" />
                    <AnimatePresence mode="wait">
                      {isActive && (
                        <motion.span
                          key={value}
                          initial={{ width: 0, opacity: 0 }}
                          animate={{ width: 'auto', opacity: 1 }}
                          exit={{ width: 0, opacity: 0 }}
                          transition={{ duration: 0.15, ease: 'easeOut' }}
                          className="overflow-hidden whitespace-nowrap"
                        >
                          {label}
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </button>
                );
              })}
            </div>
          ) : (
            <button
              onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
              className="mt-3 w-full flex items-center justify-center px-3 py-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent/60 transition-all"
              title={`Switch to ${resolvedTheme === 'dark' ? 'light' : 'dark'} mode`}
            >
              {resolvedTheme === 'dark' ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
            </button>
          )}
        </div>
      </aside>

      {/* Main area */}
      <div className={`flex-1 ${mainMargin} min-h-screen min-w-0 overflow-x-hidden transition-all duration-300`}>
        {/* Top Bar */}
        <header className="h-14 border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-20 flex items-center justify-between px-4 lg:px-6">
          <div className="flex items-center gap-3">
            {/* Mobile: Aurelo icon */}
            <div className="lg:hidden w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <AureloIcon className="w-4 h-4 text-primary" />
            </div>
            {/* Desktop: sidebar collapse toggle */}
            <button
              onClick={() => setSidebarCollapsed(c => !c)}
              className="hidden lg:flex w-8 h-8 items-center justify-center rounded-lg hover:bg-accent/60 transition-colors text-muted-foreground hover:text-foreground"
              title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {sidebarCollapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
            </button>
          </div>

          <div className="flex items-center gap-2">
            {/* Mobile: hamburger menu */}
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden w-8 h-8 flex items-center justify-center rounded-lg hover:bg-accent/60 transition-colors text-muted-foreground hover:text-foreground"
            >
              <Menu className="w-4 h-4" />
            </button>

            {/* Notification Center */}
            {workspaceId && <NotificationCenter workspaceId={workspaceId} />}

            {/* Timer Controls */}
            {!timerRunning ? (
              <button
                data-tour="timer-button"
                onClick={handleStartTimer}
                className="inline-flex items-center gap-2 px-3.5 py-1.5 text-[13px] rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 active:bg-primary/80 transition-all duration-200"
                style={{ fontWeight: 500 }}
              >
                <Timer className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Start timer</span>
              </button>
            ) : (
              <div className="inline-flex items-center gap-2.5 px-3 py-1.5 rounded-lg bg-primary/8">
                <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                <span className="text-[13px] text-primary tabular-nums" style={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}>
                  {formatTime(timerSeconds)}
                </span>
                <button
                  onClick={handleStopTimer}
                  className="w-5 h-5 rounded flex items-center justify-center bg-primary/20 hover:bg-primary/30 transition-colors"
                >
                  <Square className="w-2.5 h-2.5 text-primary" />
                </button>
              </div>
            )}
          </div>
        </header>

        {/* Page content */}
        <main>
          <TrialBanner />
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
          >
            <Outlet />
          </motion.div>
        </main>
      </div>

      {/* Mobile Fullscreen Menu Modal */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            className="fixed inset-0 z-50 bg-background flex flex-col lg:hidden touch-none"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: '-100%' }}
            transition={{ duration: 0.2 }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0.4, bottom: 0 }}
            onDragEnd={(_e, info) => {
              if (info.offset.y < -80 || info.velocity.y < -300) {
                setMobileMenuOpen(false);
              }
            }}
          >
            {/* Modal header */}
            <div className="h-14 flex items-center justify-between px-5 border-b border-border">
              <AureloWordmark className="h-[18px] w-auto text-foreground" />
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-accent/60 transition-colors text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Workspace block */}
            <button
              onClick={() => { setMobileMenuOpen(false); navigate('/settings?tab=billing'); }}
              className="flex items-center gap-3 px-5 py-4 border-b border-border text-left hover:bg-accent/40 transition-colors"
            >
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 overflow-hidden">
                {wsLogoUrl ? (
                  <img src={wsLogoUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-[13px] text-primary" style={{ fontWeight: 600 }}>{wsInitial}</span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[14px] truncate" style={{ fontWeight: 500 }}>{wsName}</div>
                <div className="text-[11px] text-muted-foreground capitalize">{planId} plan</div>
              </div>
            </button>

            {/* Nav links */}
            <nav className="flex-1 overflow-y-auto">
              {navItems.map((item) => {
                const isLocked = item.feature ? !can(item.feature) : false;
                if (item.hideUnlessFeature && isLocked) return null;
                if (item.requiresFinancials && !canViewFinancials) return null;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    onClick={() => setMobileMenuOpen(false)}
                    className={({ isActive }) =>
                      `relative flex items-center gap-3 px-5 py-4 text-[16px] transition-all duration-200 ${
                        isActive
                          ? 'bg-primary/8 text-primary'
                          : 'text-muted-foreground hover:text-foreground hover:bg-accent/60'
                      }`
                    }
                    style={{ fontWeight: 500 }}
                  >
                    {({ isActive }) => (
                      <>
                        {isActive && (
                          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-primary rounded-r-full" />
                        )}
                        <item.icon className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-primary' : 'text-muted-foreground'}`} />
                        <span className="flex-1">{item.label}</span>
                        {isLocked && <Lock className="w-3.5 h-3.5 text-muted-foreground/50 flex-shrink-0" />}
                      </>
                    )}
                  </NavLink>
                );
              })}
            </nav>

            {/* Bottom section */}
            <div className="border-t border-border px-5 py-4 space-y-3">
              {/* Settings */}
              <NavLink
                to="/settings"
                onClick={() => setMobileMenuOpen(false)}
                className={({ isActive }) =>
                  `relative flex items-center gap-3 px-0 py-2 text-[16px] transition-all duration-200 ${
                    isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
                  }`
                }
                style={{ fontWeight: 500 }}
              >
                <Settings className="w-5 h-5 flex-shrink-0" />
                Settings
              </NavLink>

              {/* User row + sign out */}
              <div className="flex items-center gap-3 py-2">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 overflow-hidden">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-[12px] text-primary" style={{ fontWeight: 600 }}>{displayInitials}</span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[14px] truncate" style={{ fontWeight: 500 }}>{displayName}</div>
                  <div className="text-[11px] text-muted-foreground truncate">{displayEmail}</div>
                </div>
                <button
                  onClick={handleSignOut}
                  className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-accent/60 transition-colors text-muted-foreground hover:text-foreground"
                  title="Sign out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>

              {/* Theme switcher */}
              <div className="flex items-center rounded-lg bg-accent/40 p-0.5">
                {([
                  { value: 'light' as const, icon: Sun, label: 'Light' },
                  { value: 'dark' as const, icon: Moon, label: 'Dark' },
                  { value: 'system' as const, icon: Monitor, label: 'Auto' },
                ]).map(({ value, icon: ThIcon, label }) => {
                  const isActive = theme === value;
                  return (
                    <button
                      key={value}
                      onClick={() => setTheme(value)}
                      className={`relative flex items-center justify-center gap-1.5 py-2 rounded-md text-[13px] transition-all duration-200 ${
                        isActive
                          ? 'bg-card text-foreground shadow-sm flex-[1.6]'
                          : 'text-muted-foreground hover:text-foreground flex-1'
                      }`}
                      style={{ fontWeight: isActive ? 600 : 400 }}
                    >
                      <ThIcon className="w-3.5 h-3.5 flex-shrink-0" />
                      {isActive && <span>{label}</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Timer Pill */}
      <AnimatePresence>
        {timerRunning && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            className="fixed bottom-6 right-6 z-50 flex items-center gap-3 bg-card border border-border rounded-full px-5 py-3"
            style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.10), 0 2px 8px rgba(0,0,0,0.06)' }}
          >
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span
              className="text-[15px] text-foreground tabular-nums"
              style={{ fontWeight: 600, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}
            >
              {formatTime(timerSeconds)}
            </span>
            <button
              onClick={handleStopTimer}
              className="w-7 h-7 rounded-full bg-primary/10 hover:bg-primary/20 flex items-center justify-center transition-colors"
            >
              <Square className="w-3 h-3 text-primary" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Log Session Modal (triggered by timer stop) */}
      <LogSessionModal
        open={showLogModal}
        onClose={() => { setShowLogModal(false); setTimerSeconds(0); }}
        onSave={handleSaveSession}
        clients={clients}
        prefilledDuration={stoppedDuration}
      />

      {/* Guided Tour */}
      <GuidedTour
        open={showTour}
        onComplete={handleTourComplete}
      />

      {/* Demo Mode Banner */}
      <AnimatePresence>
        {isDemoMode && !showTour && (
          <DemoModeBanner
            onClearDemo={handleClearDemoData}
            onRestartTour={handleRestartTour}
          />
        )}
      </AnimatePresence>

      {/* Trial Banner - remove duplicate, already in <main> above */}
    </div>
  );
}
