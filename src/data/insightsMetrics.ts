// ── Insights metrics computation ────────────────────────────────────

export interface PerformanceCard {
  key: string;
  label: string;
  value: string;
  sub: string;
  detail: string;
  warn?: boolean;
}

export interface ForwardSignal {
  id: number;
  type: string;
  signal: string;
  detail: string;
  impact: string;
  clientId: string | null;
}

export interface TimeAllocationEntry {
  category: string;
  hours: number;
  percentage: number;
}

export interface ClientRanking {
  rank: number;
  client: string;
  clientId: string;
  revenue: number;
  trueHourlyRate: number;
  utilization: number;
  share: number;
  trend: 'up' | 'down' | 'flat';
}

export interface MonthlyRevenue {
  month: string;       // "Jan 2025"
  monthKey: string;     // "2025-01"
  revenue: number;
  hours: number;
  invoiced: number;
  collected: number;
}

export interface CollectionMetrics {
  avgDaysToPay: number;
  medianDaysToPay: number;
  agingBuckets: { label: string; count: number; amount: number }[];
  collectionRate: number; // % of invoiced that's been collected
}

export interface ProfitabilityEntry {
  clientId: string;
  clientName: string;
  months: Record<string, { revenue: number; hours: number }>;
  totalRevenue: number;
  totalHours: number;
  effectiveRate: number;
}

export interface ForecastData {
  projectedMonthly: number;
  projectedAnnual: number;
  growthRate: number;   // trailing 3-month MoM avg
  activeRetainerValue: number;
  confidence: 'low' | 'medium' | 'high';
}

export interface InsightsMetrics {
  totalRevenue: number;
  totalHours: number;
  billableHours: number;
  avgHourlyRate: number;
  netRevenue: number;
  clientCount: number;
  topClient: { name: string; revenue: number } | null;
  revenueByClient: { name: string; revenue: number; percentage: number }[];
  hoursByCategory: { name: string; hours: number; percentage: number }[];
  monthlyRevenue: MonthlyRevenue[];
  periodLabel: string;
  performance: PerformanceCard[];
  clientRankings: ClientRanking[];
  timeAllocation: TimeAllocationEntry[];
  forwardSignals: ForwardSignal[];
  collectionMetrics: CollectionMetrics;
  profitability: ProfitabilityEntry[];
  forecast: ForecastData;
}

// ── Helpers ────────────────────────────────────────────────────────

function monthKey(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function monthLabel(key: string): string {
  const [y, m] = key.split('-');
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${months[parseInt(m) - 1]} ${y}`;
}

function daysBetween(a: string, b: string): number {
  return Math.ceil((new Date(b).getTime() - new Date(a).getTime()) / (1000 * 60 * 60 * 24));
}

function median(arr: number[]): number {
  if (arr.length === 0) return 0;
  const s = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

// ── Main computation ──────────────────────────────────────────────

export function computeInsightsMetrics(
  sessions: any[],
  clients: any[],
  netMultiplier: number,
  invoices?: any[],
): InsightsMetrics {
  const totalRevenue = sessions.reduce((sum, s) => sum + (s.revenue || 0), 0);
  const totalHours = sessions.reduce((sum, s) => sum + (s.duration || 0), 0);
  const billableHours = sessions.filter(s => s.billable).reduce((sum, s) => sum + (s.duration || 0), 0);
  const avgHourlyRate = billableHours > 0 ? totalRevenue / billableHours : 0;
  const netRevenue = totalRevenue * netMultiplier;

  // Revenue by client
  const clientRevMap: Record<string, number> = {};
  sessions.forEach(s => {
    if (s.client) clientRevMap[s.client] = (clientRevMap[s.client] || 0) + (s.revenue || 0);
  });
  const revenueByClient = Object.entries(clientRevMap)
    .map(([name, revenue]) => ({ name, revenue, percentage: totalRevenue > 0 ? (revenue / totalRevenue) * 100 : 0 }))
    .sort((a, b) => b.revenue - a.revenue);

  const topClient = revenueByClient.length > 0 ? revenueByClient[0] : null;

  // Hours by category
  const catMap: Record<string, number> = {};
  sessions.forEach(s => {
    (s.workTags || []).forEach((tag: string) => {
      catMap[tag] = (catMap[tag] || 0) + (s.duration || 0);
    });
  });
  const hoursByCategory = Object.entries(catMap)
    .map(([name, hours]) => ({ name, hours, percentage: totalHours > 0 ? (hours / totalHours) * 100 : 0 }))
    .sort((a, b) => b.hours - a.hours);

  // ── Monthly revenue (from sessions) ──────────────────────────
  const monthlyMap: Record<string, { revenue: number; hours: number }> = {};
  sessions.forEach(s => {
    if (!s.date) return;
    const mk = monthKey(s.date);
    if (!monthlyMap[mk]) monthlyMap[mk] = { revenue: 0, hours: 0 };
    monthlyMap[mk].revenue += s.revenue || 0;
    monthlyMap[mk].hours += s.duration || 0;
  });

  // Invoiced & collected per month (from invoices)
  const invoicedMap: Record<string, number> = {};
  const collectedMap: Record<string, number> = {};
  (invoices || []).forEach(inv => {
    if (inv.issuedDate) {
      const mk = monthKey(inv.issuedDate);
      invoicedMap[mk] = (invoicedMap[mk] || 0) + (inv.total || 0);
    }
    if (inv.status === 'paid' && inv.paidDate) {
      const mk = monthKey(inv.paidDate);
      collectedMap[mk] = (collectedMap[mk] || 0) + (inv.total || 0);
    }
  });

  // Build sorted monthly array (last 12 months)
  const allMonthKeys = new Set([...Object.keys(monthlyMap), ...Object.keys(invoicedMap), ...Object.keys(collectedMap)]);
  const monthlyRevenue: MonthlyRevenue[] = [...allMonthKeys]
    .sort()
    .slice(-12)
    .map(mk => ({
      month: monthLabel(mk),
      monthKey: mk,
      revenue: monthlyMap[mk]?.revenue || 0,
      hours: monthlyMap[mk]?.hours || 0,
      invoiced: invoicedMap[mk] || 0,
      collected: collectedMap[mk] || 0,
    }));

  // ── Collection metrics ──────────────────────────────────────
  const paidInvoices = (invoices || []).filter((i: any) => i.status === 'paid' && i.issuedDate && i.paidDate);
  const daysToPay = paidInvoices.map((i: any) => Math.max(0, daysBetween(i.issuedDate, i.paidDate)));
  const avgDaysToPay = daysToPay.length > 0 ? Math.round(daysToPay.reduce((a: number, b: number) => a + b, 0) / daysToPay.length) : 0;
  const medianDaysToPay = Math.round(median(daysToPay));

  const now = new Date();
  const outstandingInvoices = (invoices || []).filter((i: any) => i.status === 'sent' || i.status === 'overdue');
  const agingBuckets = [
    { label: 'Current', count: 0, amount: 0 },
    { label: '1–30 days', count: 0, amount: 0 },
    { label: '31–60 days', count: 0, amount: 0 },
    { label: '60+ days', count: 0, amount: 0 },
  ];
  outstandingInvoices.forEach((inv: any) => {
    const age = inv.dueDate ? daysBetween(inv.dueDate, now.toISOString()) : 0;
    const idx = age <= 0 ? 0 : age <= 30 ? 1 : age <= 60 ? 2 : 3;
    agingBuckets[idx].count++;
    agingBuckets[idx].amount += inv.total || 0;
  });

  const totalInvoiced = (invoices || []).reduce((s: number, i: any) => s + (i.total || 0), 0);
  const totalCollected = paidInvoices.reduce((s: number, i: any) => s + (i.total || 0), 0);
  const collectionRate = totalInvoiced > 0 ? Math.round((totalCollected / totalInvoiced) * 100) : 0;

  const collectionMetrics: CollectionMetrics = { avgDaysToPay, medianDaysToPay, agingBuckets, collectionRate };

  // ── Profitability heatmap ───────────────────────────────────
  const clientMonthMap: Record<string, Record<string, { revenue: number; hours: number }>> = {};
  sessions.forEach(s => {
    if (!s.clientId || !s.date) return;
    const cId = s.clientId;
    const mk = monthKey(s.date);
    if (!clientMonthMap[cId]) clientMonthMap[cId] = {};
    if (!clientMonthMap[cId][mk]) clientMonthMap[cId][mk] = { revenue: 0, hours: 0 };
    clientMonthMap[cId][mk].revenue += s.revenue || 0;
    clientMonthMap[cId][mk].hours += s.duration || 0;
  });

  const profitability: ProfitabilityEntry[] = Object.entries(clientMonthMap)
    .map(([clientId, months]) => {
      const c = clients.find((cl: any) => cl.id === clientId);
      const totalRev = Object.values(months).reduce((s, m) => s + m.revenue, 0);
      const totalHrs = Object.values(months).reduce((s, m) => s + m.hours, 0);
      return {
        clientId,
        clientName: c?.name || 'Unknown',
        months,
        totalRevenue: totalRev,
        totalHours: totalHrs,
        effectiveRate: totalHrs > 0 ? Math.round(totalRev / totalHrs) : 0,
      };
    })
    .sort((a, b) => b.totalRevenue - a.totalRevenue)
    .slice(0, 10);

  // ── Forecasting ─────────────────────────────────────────────
  const recentMonths = monthlyRevenue.slice(-3);
  let growthRate = 0;
  if (recentMonths.length >= 2) {
    const growths: number[] = [];
    for (let i = 1; i < recentMonths.length; i++) {
      const prev = recentMonths[i - 1].revenue;
      if (prev > 0) growths.push((recentMonths[i].revenue - prev) / prev);
    }
    growthRate = growths.length > 0 ? growths.reduce((a, b) => a + b, 0) / growths.length : 0;
  }

  const lastMonthRev = recentMonths.length > 0 ? recentMonths[recentMonths.length - 1].revenue : 0;
  const projectedMonthly = Math.round(lastMonthRev * (1 + growthRate));
  const projectedAnnual = projectedMonthly * 12;

  const activeRetainerValue = clients
    .filter((c: any) => c.status === 'Active' && c.model === 'Retainer' && c.retainerTotal > 0)
    .reduce((s: number, c: any) => s + (c.rate || 0) * (c.retainerTotal || 0), 0);

  const confidence: 'low' | 'medium' | 'high' =
    recentMonths.length < 2 ? 'low' : Math.abs(growthRate) > 0.3 ? 'low' : recentMonths.length >= 3 ? 'high' : 'medium';

  const forecast: ForecastData = { projectedMonthly, projectedAnnual, growthRate, activeRetainerValue, confidence };

  // ── Client rankings ─────────────────────────────────────────
  const activeClients = clients.filter((c: any) => c.status === 'Active');

  // Determine trend per client: compare last 2 months
  function getClientTrend(clientId: string): 'up' | 'down' | 'flat' {
    const cm = clientMonthMap[clientId];
    if (!cm) return 'flat';
    const keys = Object.keys(cm).sort();
    if (keys.length < 2) return 'flat';
    const last = cm[keys[keys.length - 1]]?.revenue || 0;
    const prev = cm[keys[keys.length - 2]]?.revenue || 0;
    if (last > prev * 1.05) return 'up';
    if (last < prev * 0.95) return 'down';
    return 'flat';
  }

  const clientRankings: ClientRanking[] = activeClients
    .filter((c: any) => clientRevMap[c.name])
    .map((c: any, i: number) => ({
      rank: i + 1,
      client: c.name,
      clientId: c.id,
      revenue: clientRevMap[c.name] || 0,
      trueHourlyRate: c.trueHourlyRate || 0,
      utilization: c.retainerTotal > 0 ? Math.round(((c.retainerTotal - c.retainerRemaining) / c.retainerTotal) * 100) : 75,
      share: totalRevenue > 0 ? Math.round(((clientRevMap[c.name] || 0) / totalRevenue) * 100) : 0,
      trend: getClientTrend(c.id),
    }))
    .sort((a, b) => b.revenue - a.revenue);

  // Time allocation
  const timeAllocation: TimeAllocationEntry[] = hoursByCategory.map(h => ({
    category: h.name,
    hours: Math.round(h.hours * 10) / 10,
    percentage: Math.round(h.percentage),
  }));

  // Performance cards
  const topShare = clientRankings.length > 0 ? clientRankings[0].share : 0;
  const topClientName = clientRankings.length > 0 ? clientRankings[0].client : '';
  const billablePct = totalHours > 0 ? Math.round((billableHours / totalHours) * 100) : 0;
  const billableFeedback = billablePct >= 80 ? '— great balance' : billablePct >= 60 ? '— solid' : "— you're spending a lot of time on unpaid work";

  // Effective rate trend (month-over-month)
  const currentMonthRate = recentMonths.length > 0 && recentMonths[recentMonths.length - 1].hours > 0
    ? Math.round(recentMonths[recentMonths.length - 1].revenue / recentMonths[recentMonths.length - 1].hours)
    : 0;
  const prevMonthRate = recentMonths.length > 1 && recentMonths[recentMonths.length - 2].hours > 0
    ? Math.round(recentMonths[recentMonths.length - 2].revenue / recentMonths[recentMonths.length - 2].hours)
    : 0;
  const rateDiff = currentMonthRate - prevMonthRate;
  const rateTrendDetail = prevMonthRate > 0
    ? (rateDiff >= 0
      ? `You're earning $${rateDiff} more per hour than last month`
      : `Down $${Math.abs(rateDiff)}/hr from last month — check if you're logging more non-billable time`)
    : `Based on ${Math.round(totalHours)}h total`;

  const performance: PerformanceCard[] = [
    { key: 'concentration', label: 'Client dependency', value: `${topShare}%`, sub: topClientName || 'top client', detail: topShare > 50 ? 'Most of your income comes from one client — consider diversifying' : 'Your income is spread across multiple clients — healthy', warn: topShare > 50 },
    { key: 'utilization', label: 'Billable time', value: `${billablePct}%`, sub: 'of your hours earn money', detail: `${Math.round(billableHours)}h billable of ${Math.round(totalHours)}h total ${billableFeedback}` },
    { key: 'retainer', label: 'Effective rate', value: `$${Math.round(avgHourlyRate)}`, sub: 'avg. per hour worked', detail: `Based on ${Math.round(billableHours)}h billable` },
    { key: 'margin', label: 'Rate trend', value: `$${currentMonthRate}`, sub: '/hr this month', detail: rateTrendDetail, warn: rateDiff < -5 },
  ];

  // Forward signals
  const forwardSignals: ForwardSignal[] = [];

  // Revenue concentration warning
  if (topShare > 60) {
    forwardSignals.push({ id: forwardSignals.length + 1, type: 'overage', signal: `Revenue concentration risk: ${topShare}% from one client`, detail: 'Diversifying reduces risk if this client leaves', impact: 'High', clientId: clientRankings[0]?.clientId || null });
  }

  // Growth/decline signals
  if (growthRate < -0.15 && recentMonths.length >= 2) {
    forwardSignals.push({ id: forwardSignals.length + 1, type: 'projection', signal: 'Revenue declining month-over-month', detail: `${Math.round(growthRate * 100)}% avg monthly change`, impact: 'High', clientId: null });
  } else if (growthRate > 0.1 && recentMonths.length >= 2) {
    forwardSignals.push({ id: forwardSignals.length + 1, type: 'expansion', signal: 'Revenue growing month-over-month', detail: `+${Math.round(growthRate * 100)}% avg monthly growth`, impact: 'Medium', clientId: null });
  }

  // Collection warning
  if (avgDaysToPay > 30 && daysToPay.length >= 3) {
    forwardSignals.push({ id: forwardSignals.length + 1, type: 'milestone', signal: `Slow collections: ${avgDaysToPay} avg days to pay`, detail: 'Consider shorter payment terms or follow-up automation', impact: 'Medium', clientId: null });
  }

  // Retainer warnings
  activeClients.forEach((c: any) => {
    if (c.retainerTotal > 0) {
      const used = c.retainerTotal - (c.retainerRemaining || 0);
      const pct = Math.round((used / c.retainerTotal) * 100);
      if (pct >= 70) {
        forwardSignals.push({ id: forwardSignals.length + 1, type: 'overage', signal: `${c.name} retainer at ${pct}%`, detail: `${c.retainerRemaining}h remaining of ${c.retainerTotal}h`, impact: pct >= 85 ? 'High' : 'Medium', clientId: c.id });
      }
    }
    if (c.status === 'Prospect' || (c.status === 'Active' && !c.lastSessionDate)) {
      forwardSignals.push({ id: forwardSignals.length + 1, type: 'inactive', signal: `${c.name} — no recent sessions`, detail: 'Follow up recommended', impact: 'Low', clientId: c.id });
    }
  });

  return {
    totalRevenue,
    totalHours,
    billableHours,
    avgHourlyRate,
    netRevenue,
    clientCount: activeClients.length,
    topClient,
    revenueByClient,
    hoursByCategory,
    monthlyRevenue,
    periodLabel: 'This month',
    performance,
    clientRankings,
    timeAllocation,
    forwardSignals,
    collectionMetrics,
    profitability,
    forecast,
  };
}
