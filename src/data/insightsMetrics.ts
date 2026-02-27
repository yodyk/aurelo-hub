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
  monthlyRevenue: { month: string; revenue: number; hours: number }[];
  periodLabel: string;
  performance: PerformanceCard[];
  clientRankings: ClientRanking[];
  timeAllocation: TimeAllocationEntry[];
  forwardSignals: ForwardSignal[];
}

export function computeInsightsMetrics(
  sessions: any[],
  clients: any[],
  netMultiplier: number,
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

  // Client rankings
  const activeClients = clients.filter(c => c.status === 'Active');
  const clientRankings: ClientRanking[] = activeClients
    .filter(c => clientRevMap[c.name])
    .map((c, i) => ({
      rank: i + 1,
      client: c.name,
      clientId: c.id,
      revenue: clientRevMap[c.name] || 0,
      trueHourlyRate: c.trueHourlyRate || 0,
      utilization: c.retainerTotal > 0 ? Math.round(((c.retainerTotal - c.retainerRemaining) / c.retainerTotal) * 100) : 75,
      share: totalRevenue > 0 ? Math.round(((clientRevMap[c.name] || 0) / totalRevenue) * 100) : 0,
      trend: 'up' as const,
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
  const utilizationAvg = clientRankings.length > 0 ? Math.round(clientRankings.reduce((s, r) => s + r.utilization, 0) / clientRankings.length) : 0;
  const performance: PerformanceCard[] = [
    { key: 'concentration', label: 'Client concentration', value: `${topShare}%`, sub: 'top client', detail: topShare > 50 ? 'High dependency — consider diversifying' : 'Healthy distribution', warn: topShare > 50 },
    { key: 'utilization', label: 'Avg utilization', value: `${utilizationAvg}%`, sub: 'across clients', detail: utilizationAvg >= 80 ? 'Strong utilization' : 'Room to improve' },
    { key: 'retainer', label: 'Effective rate', value: `$${Math.round(avgHourlyRate)}`, sub: '/hour', detail: `Based on ${Math.round(billableHours)}h billable` },
    { key: 'margin', label: 'Net margin', value: `${Math.round(netMultiplier * 100)}%`, sub: 'after fees & tax', detail: `$${Math.round(netRevenue).toLocaleString()} net revenue` },
  ];

  // Forward signals
  const forwardSignals: ForwardSignal[] = [];
  // Retainer warnings
  activeClients.forEach(c => {
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
    monthlyRevenue: [],
    periodLabel: 'This month',
    performance,
    clientRankings,
    timeAllocation,
    forwardSignals,
  };
}
