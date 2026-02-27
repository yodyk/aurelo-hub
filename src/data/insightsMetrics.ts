// ── Insights metrics computation ────────────────────────────────────

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

  return {
    totalRevenue,
    totalHours,
    billableHours,
    avgHourlyRate,
    netRevenue,
    clientCount: clients.filter(c => c.status === 'Active').length,
    topClient,
    revenueByClient,
    hoursByCategory,
    monthlyRevenue: [],
  };
}
