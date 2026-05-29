/**
 * MobileBottomNav — persistent thumb-reach navigation for < lg viewports.
 *
 * 5 slots: Today · Tasks · Clients · Time · More.
 * "More" opens a bottom sheet with the overflow links (Projects, Invoices,
 * Insights, Settings) so the primary nav stays at 5.
 *
 * Hidden entirely on lg+ — desktop sidebar is untouched.
 */
import { useState } from 'react';
import { NavLink } from 'react-router';
import { LayoutDashboard, Users, Clock, CheckSquare, MoreHorizontal, FileText, TrendingUp, Settings, Briefcase } from 'lucide-react';
import { BottomSheet } from './primitives/BottomSheet';
import { usePlan } from '../data/PlanContext';
import { useRoleAccess } from '../data/useRoleAccess';
import type { FeatureKey } from '../data/plans';

const PRIMARY = [
  { to: '/', icon: LayoutDashboard, label: 'Today', end: true },
  { to: '/tasks', icon: CheckSquare, label: 'Tasks' },
  { to: '/clients', icon: Users, label: 'Clients' },
  { to: '/time', icon: Clock, label: 'Time' },
];

const OVERFLOW: { to: string; icon: any; label: string; feature?: FeatureKey; requiresFinancials?: boolean }[] = [
  { to: '/projects', icon: Briefcase, label: 'Projects' },
  { to: '/invoicing', icon: FileText, label: 'Invoices', feature: 'clientInvoicing', requiresFinancials: true },
  { to: '/insights', icon: TrendingUp, label: 'Insights', requiresFinancials: true },
  { to: '/settings', icon: Settings, label: 'Settings' },
];

export function MobileBottomNav() {
  const [moreOpen, setMoreOpen] = useState(false);
  const { can } = usePlan();
  const { canViewFinancials } = useRoleAccess();

  return (
    <>
      <nav
        className="lg:hidden fixed inset-x-0 bottom-0 z-40 bg-background/95 backdrop-blur-md border-t border-[var(--hairline)]"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="flex items-stretch h-14">
          {PRIMARY.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors ${
                  isActive ? 'text-primary' : 'text-muted-foreground'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <item.icon className={`w-[18px] h-[18px] ${isActive ? 'text-primary' : ''}`} />
                  <span className="text-[10px]" style={{ fontWeight: isActive ? 600 : 500 }}>{item.label}</span>
                </>
              )}
            </NavLink>
          ))}
          <button
            onClick={() => setMoreOpen(true)}
            className="flex-1 flex flex-col items-center justify-center gap-0.5 text-muted-foreground"
          >
            <MoreHorizontal className="w-[18px] h-[18px]" />
            <span className="text-[10px]" style={{ fontWeight: 500 }}>More</span>
          </button>
        </div>
      </nav>

      <BottomSheet open={moreOpen} onClose={() => setMoreOpen(false)} title="More">
        <div className="py-2">
          {OVERFLOW.map((item) => {
            const isLocked = item.feature ? !can(item.feature) : false;
            if (item.requiresFinancials && !canViewFinancials) return null;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setMoreOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-5 py-3.5 text-[14px] transition-colors ${
                    isActive ? 'text-primary bg-primary/5' : 'text-foreground hover:bg-accent/40'
                  } ${isLocked ? 'opacity-50' : ''}`
                }
                style={{ fontWeight: 500 }}
              >
                <item.icon className="w-4 h-4 flex-shrink-0" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </div>
      </BottomSheet>
    </>
  );
}
