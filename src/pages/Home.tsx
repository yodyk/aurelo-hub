import { useState, useMemo, useEffect, useRef } from 'react';
import { Clock } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';

/* ── Animated number (count-up) ── */
function AnimatedNumber({ value, prefix = '', suffix = '' }: { value: number; prefix?: string; suffix?: string }) {
  const [display, setDisplay] = useState(0);
  const prev = useRef(0);

  useEffect(() => {
    const start = prev.current;
    const diff = value - start;
    if (diff === 0) { setDisplay(value); return; }
    const duration = 600;
    const startTime = performance.now();

    const tick = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(start + diff * eased));
      if (progress < 1) requestAnimationFrame(tick);
      else prev.current = value;
    };
    requestAnimationFrame(tick);
  }, [value]);

  return <>{prefix}{display.toLocaleString('en-US')}{suffix}</>;
}

/* ── Temporary demo data ── */
const demoSessions = [
  { id: '1', date: new Date().toISOString().split('T')[0], duration_minutes: 210, description: 'Brand guidelines v2', billable: true, client: 'Arcadia Design' },
  { id: '2', date: new Date().toISOString().split('T')[0], duration_minutes: 120, description: 'Dashboard wireframes', billable: true, client: 'Meridian Labs' },
  { id: '3', date: new Date(Date.now() - 86400000).toISOString().split('T')[0], duration_minutes: 90, description: 'Client presentation', billable: true, client: 'Beacon Studio' },
  { id: '4', date: new Date(Date.now() - 86400000).toISOString().split('T')[0], duration_minutes: 240, description: 'Logo explorations', billable: true, client: 'Arcadia Design' },
  { id: '5', date: new Date(Date.now() - 2 * 86400000).toISOString().split('T')[0], duration_minutes: 60, description: 'Strategy call', billable: false, client: 'Meridian Labs' },
];

const demoMonthlyTrend = [
  { month: 'Sep', revenue: 4200 },
  { month: 'Oct', revenue: 5800 },
  { month: 'Nov', revenue: 4900 },
  { month: 'Dec', revenue: 6400 },
  { month: 'Jan', revenue: 7200 },
  { month: 'Feb', revenue: 5600 },
];

const demoAlerts = [
  { id: 'ret-1', type: 'retainer' as const, message: 'Arcadia Design: 18 of 20 retainer hours used (90%) — 2 hours remaining this cycle.' },
];

export default function Home() {
  const displayRevenue = 5600;
  const totalHours = useMemo(() => demoSessions.reduce((sum, s) => sum + s.duration_minutes, 0) / 60, []);
  const ehr = useMemo(() => totalHours > 0 ? Math.round(displayRevenue / totalHours) : null, [totalHours]);
  const billablePercent = useMemo(() => {
    const billable = demoSessions.filter(s => s.billable).length;
    return Math.round((billable / demoSessions.length) * 100);
  }, []);

  const paceMessage = 'On pace for $8,960 — ahead of last month by 12%.';

  const recentSessions = demoSessions.slice(0, 5);

  return (
    <div className="space-y-12">
      {/* ── Monthly Pulse Panel ── */}
      <section className="card-ambient p-6 space-y-6 bg-card border border-border/30 rounded-[4px] shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
        <div className="flex items-center justify-between">
          <p className="type-caption fg-tertiary">
            Earnings this month
          </p>
        </div>
        <div>
          <p className="type-display text-5xl text-primary">
            $<AnimatedNumber value={displayRevenue} />
          </p>
          <p className="type-body mt-2">{paceMessage}</p>
        </div>

        {/* Secondary metrics inline within panel */}
        <div className="flex items-center gap-8 flex-wrap pt-2 border-t border-border/20">
          <div>
            <p className="type-caption fg-tertiary">Time invested</p>
            <p className="type-heading mt-0.5">{totalHours.toFixed(1)}h</p>
          </div>
          <div className="w-px h-8 bg-border/20" />
          <div>
            <p className="type-caption fg-tertiary">True hourly rate</p>
            {ehr !== null ? (
              <p className="text-2xl font-semibold tracking-tighter tabular-nums text-primary mt-0.5">${ehr}</p>
            ) : (
              <p className="type-body mt-0.5">Insufficient time data.</p>
            )}
          </div>
          <div className="w-px h-8 bg-border/20" />
          <div>
            <p className="type-caption fg-tertiary">Billable</p>
            <p className="type-heading mt-0.5">{billablePercent}%</p>
          </div>
        </div>

        {/* 6-month trend inline within panel */}
        <div className="pt-2">
          <p className="type-caption fg-tertiary mb-3">6-month trend</p>
          <ResponsiveContainer width="100%" height={120}>
            <BarChart data={demoMonthlyTrend} barCategoryGap="24%">
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border)/0.5)" vertical={false} horizontal={true} />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                axisLine={false}
                tickLine={false}
                dy={4}
              />
              <YAxis
                tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground)/0.4)' }}
                axisLine={false}
                tickLine={false}
                width={40}
                tickFormatter={(v: number) => v >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${v}`}
              />
              <Tooltip
                formatter={(value: number) => [`$${value.toLocaleString()}`, 'Earnings']}
                contentStyle={{
                  background: 'hsl(var(--popover))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '4px',
                  fontSize: '12px',
                  padding: '6px 10px',
                }}
                itemStyle={{ color: 'hsl(var(--foreground))' }}
                cursor={{ fill: 'hsl(var(--muted)/0.3)' }}
              />
              <Bar dataKey="revenue" fill="hsl(var(--muted-foreground)/0.6)" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Needs attention */}
      {demoAlerts.length > 0 && (
        <section className="space-y-1.5">
          <p className="type-caption fg-tertiary mb-2">
            Needs attention
          </p>
          {demoAlerts.map(alert => (
            <div
              key={alert.id}
              className="flex items-start gap-3 py-2.5 text-sm fg-secondary leading-relaxed animate-in fade-in-0 duration-300"
            >
              <div className="h-1.5 w-1.5 rounded-full bg-warning flex-shrink-0 mt-1.5" />
              <span>{alert.message}</span>
            </div>
          ))}
        </section>
      )}

      {/* Recent work */}
      <section>
        <p className="type-caption fg-tertiary mb-3">
          Recent work
        </p>
        <div className="bg-card border border-border/50 rounded-[4px] divide-y divide-border/40 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
          {recentSessions.map(s => (
            <div key={s.id} className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-4 min-w-0">
                <span className="type-caption fg-tertiary tabular-nums w-[72px] flex-shrink-0">{s.date}</span>
                <span className="text-sm font-medium text-foreground truncate">{s.client}</span>
              </div>
              <div className="flex items-center gap-5 flex-shrink-0">
                <span className="type-caption fg-tertiary tabular-nums">{s.duration_minutes}m</span>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
