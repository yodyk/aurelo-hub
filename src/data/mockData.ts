// Mock data for Aurelo financial command center

export const monthlyData = [
  { month: 'Sep', earnings: 8200, net: 7380 },
  { month: 'Oct', earnings: 12400, net: 11160 },
  { month: 'Nov', earnings: 9800, net: 8820 },
  { month: 'Dec', earnings: 15200, net: 13680 },
  { month: 'Jan', earnings: 11600, net: 10440 },
  { month: 'Feb', earnings: 14800, net: 13320 },
];

export const recentWork = [
  { id: 1, client: 'Arcadia Design', project: 'Brand refresh', date: 'Feb 23', hours: 4.5, revenue: 675 },
  { id: 2, client: 'Lumina Co', project: 'Website redesign', date: 'Feb 22', hours: 6.0, revenue: 900 },
  { id: 3, client: 'Novo Health', project: 'App UI design', date: 'Feb 21', hours: 3.5, revenue: 525 },
  { id: 4, client: 'Arcadia Design', project: 'Marketing materials', date: 'Feb 20', hours: 2.0, revenue: 300 },
  { id: 5, client: 'Lumina Co', project: 'Component library', date: 'Feb 19', hours: 5.5, revenue: 825 },
];

export const alerts = [
  { id: 1, type: 'warning', message: 'Novo Health: 22 of 30 hours used — 8 hours remaining', clientId: 'novo' },
  { id: 2, type: 'info', message: 'Lumina Co invoice due Feb 28', clientId: 'lumina' },
];

export const notifications = [
  { id: 1, type: 'retainer', title: 'Retainer threshold', message: 'Novo Health has used 73% of retainer hours', clientId: 'novo', read: false, timestamp: '2 hours ago' },
  { id: 2, type: 'retainer', title: 'Retainer threshold', message: 'Arcadia Design has used 70% of retainer hours', clientId: 'arcadia', read: false, timestamp: '1 day ago' },
  { id: 3, type: 'info', title: 'Invoice reminder', message: 'Lumina Co invoice due in 3 days', clientId: 'lumina', read: true, timestamp: '2 days ago' },
];

export const clients = [
  { 
    id: 'arcadia', 
    name: 'Arcadia Design', 
    status: 'Active', 
    model: 'Retainer', 
    rate: 150,
    monthlyEarnings: 6200,
    lifetimeRevenue: 48600,
    hoursLogged: 324,
    retainerRemaining: 12,
    retainerTotal: 40,
    trueHourlyRate: 155,
    contactName: 'Sarah Chen',
    contactEmail: 'sarah@arcadiadesign.co',
    website: 'arcadiadesign.co',
    showPortalCosts: true,
    lastSessionDate: 'Feb 23, 2026',
  },
  { 
    id: 'lumina', 
    name: 'Lumina Co', 
    status: 'Active', 
    model: 'Hourly', 
    rate: 150,
    monthlyEarnings: 4800,
    lifetimeRevenue: 22400,
    hoursLogged: 149,
    retainerRemaining: 0,
    retainerTotal: 0,
    trueHourlyRate: 148,
    contactName: 'Marcus Rivera',
    contactEmail: 'marcus@luminaco.com',
    website: 'luminaco.com',
    showPortalCosts: true,
    lastSessionDate: 'Feb 22, 2026',
  },
  { 
    id: 'novo', 
    name: 'Novo Health', 
    status: 'Active', 
    model: 'Retainer', 
    rate: 150,
    monthlyEarnings: 3800,
    lifetimeRevenue: 15200,
    hoursLogged: 101,
    retainerRemaining: 8,
    retainerTotal: 30,
    trueHourlyRate: 152,
    contactName: 'Dr. Amy Lin',
    contactEmail: 'amy@novohealth.io',
    website: 'novohealth.io',
    showPortalCosts: false,
    lastSessionDate: 'Feb 21, 2026',
  },
  { 
    id: 'terra', 
    name: 'Terra Studios', 
    status: 'Prospect', 
    model: 'Project', 
    rate: 0,
    monthlyEarnings: 0,
    lifetimeRevenue: 0,
    hoursLogged: 0,
    retainerRemaining: 0,
    retainerTotal: 0,
    trueHourlyRate: 0,
    contactName: 'Jake Ortiz',
    contactEmail: 'jake@terrastudios.com',
    website: 'terrastudios.com',
    showPortalCosts: true,
    lastSessionDate: null,
  },
  { 
    id: 'zenith', 
    name: 'Zenith Labs', 
    status: 'Archived', 
    model: 'Hourly', 
    rate: 140,
    monthlyEarnings: 0,
    lifetimeRevenue: 18900,
    hoursLogged: 135,
    retainerRemaining: 0,
    retainerTotal: 0,
    trueHourlyRate: 140,
    contactName: 'Ben Harlow',
    contactEmail: 'ben@zenithlabs.co',
    website: 'zenithlabs.co',
    showPortalCosts: true,
    lastSessionDate: 'Dec 14, 2025',
  },
];

export const clientProjects = {
  arcadia: [
    { id: 1, name: 'Brand refresh', status: 'In Progress', hours: 42, revenue: 6300, estimatedHours: 60, startDate: 'Jan 10', endDate: 'Mar 15', totalValue: 9000 },
    { id: 2, name: 'Marketing materials', status: 'In Progress', hours: 12, revenue: 1800, estimatedHours: 24, startDate: 'Feb 1', endDate: 'Mar 30', totalValue: 3600 },
    { id: 3, name: 'Website audit', status: 'Complete', hours: 8, revenue: 1200, estimatedHours: 8, startDate: 'Dec 5', endDate: 'Dec 20', totalValue: 1200 },
  ],
  lumina: [
    { id: 1, name: 'Website redesign', status: 'In Progress', hours: 64, revenue: 9600, estimatedHours: 100, startDate: 'Jan 15', endDate: 'Apr 1', totalValue: 15000 },
    { id: 2, name: 'Content strategy', status: 'Complete', hours: 18, revenue: 2700, estimatedHours: 20, startDate: 'Nov 1', endDate: 'Dec 15', totalValue: 3000 },
  ],
  novo: [
    { id: 1, name: 'App UI design', status: 'In Progress', hours: 52, revenue: 7800, estimatedHours: 80, startDate: 'Feb 1', endDate: 'Apr 15', totalValue: 12000 },
  ],
};

export const timeSessions = [
  { id: 1, date: 'Feb 25, 2026', dateGroup: 'Today', client: 'Arcadia Design', clientId: 'arcadia', task: 'Brand refresh — final presentation prep', tags: ['Design', 'Branding'], workTags: ['Design'], duration: 3.0, revenue: 450, billable: true },
  { id: 2, date: 'Feb 25, 2026', dateGroup: 'Today', client: 'Lumina Co', clientId: 'lumina', task: 'Website redesign — responsive breakpoints', tags: ['Design', 'Web'], workTags: ['Development'], duration: 2.5, revenue: 375, billable: true },
  { id: 3, date: 'Feb 24, 2026', dateGroup: 'Yesterday', client: 'Novo Health', clientId: 'novo', task: 'App UI — onboarding flow review', tags: ['Design', 'Mobile'], workTags: ['Design', 'Meetings'], duration: 4.0, revenue: 600, billable: true },
  { id: 4, date: 'Feb 24, 2026', dateGroup: 'Yesterday', client: 'Terra Studios', clientId: 'terra', task: 'Initial scope discussion', tags: ['Strategy'], workTags: ['Prospecting'], duration: 1.0, revenue: 0, billable: false },
  { id: 5, date: 'Feb 23, 2026', dateGroup: 'Feb 23', client: 'Arcadia Design', clientId: 'arcadia', task: 'Brand refresh — color exploration', tags: ['Design', 'Branding'], workTags: ['Design'], duration: 4.5, revenue: 675, billable: true },
  { id: 6, date: 'Feb 22, 2026', dateGroup: 'Feb 22', client: 'Lumina Co', clientId: 'lumina', task: 'Website redesign — homepage layout', tags: ['Design', 'Web'], workTags: ['Design'], duration: 6.0, revenue: 900, billable: true },
  { id: 7, date: 'Feb 21, 2026', dateGroup: 'Feb 21', client: 'Novo Health', clientId: 'novo', task: 'App UI — dashboard screens', tags: ['Design', 'Mobile'], workTags: ['Design'], duration: 3.5, revenue: 525, billable: true },
  { id: 8, date: 'Feb 20, 2026', dateGroup: 'Feb 20', client: 'Arcadia Design', clientId: 'arcadia', task: 'Marketing materials — social templates', tags: ['Design', 'Marketing'], workTags: ['Design'], duration: 2.0, revenue: 300, billable: true },
  { id: 9, date: 'Feb 19, 2026', dateGroup: 'Feb 19', client: 'Lumina Co', clientId: 'lumina', task: 'Website redesign — component library', tags: ['Design', 'Web'], workTags: ['Development'], duration: 5.5, revenue: 825, billable: true },
  { id: 10, date: 'Feb 18, 2026', dateGroup: 'Feb 18', client: 'Novo Health', clientId: 'novo', task: 'App UI — user flows', tags: ['Design', 'Strategy'], workTags: ['Strategy/Research'], duration: 4.0, revenue: 600, billable: true },
];

export const clientRankings = [
  { rank: 1, client: 'Arcadia Design', clientId: 'arcadia', revenue: 6200, trueHourlyRate: 155, utilization: 82, share: 42, trend: 'up' as const },
  { rank: 2, client: 'Lumina Co', clientId: 'lumina', revenue: 4800, trueHourlyRate: 148, utilization: 76, share: 32, trend: 'up' as const },
  { rank: 3, client: 'Novo Health', clientId: 'novo', revenue: 3800, trueHourlyRate: 152, utilization: 71, share: 26, trend: 'down' as const },
];

export const timeAllocation = [
  { category: 'Design', hours: 94, percentage: 59 },
  { category: 'Development', hours: 32, percentage: 20 },
  { category: 'Meetings', hours: 16, percentage: 10 },
  { category: 'Strategy/Research', hours: 12, percentage: 7 },
  { category: 'Prospecting', hours: 6, percentage: 4 },
];

export const forwardSignals = [
  { id: 1, type: 'projection', signal: 'On pace for $16,500 this month', detail: 'Based on current billing velocity', impact: 'High', clientId: null },
  { id: 2, type: 'milestone', signal: 'Lumina Co — website redesign mid-project milestone', detail: 'Due Mar 1 · $4,500 payment', impact: 'High', clientId: 'lumina' },
  { id: 3, type: 'overage', signal: 'Novo Health likely retainer overage', detail: '73% used with 11 days remaining', impact: 'Medium', clientId: 'novo' },
  { id: 4, type: 'expansion', signal: 'Arcadia Design discussing Q2 expansion', detail: 'Follow up scheduled for next week', impact: 'Medium', clientId: 'arcadia' },
  { id: 5, type: 'inactive', signal: 'Terra Studios — no sessions logged', detail: 'Prospect since Feb 10 · follow up recommended', impact: 'Low', clientId: 'terra' },
];

// Financial settings (workspace-level)
export const financialSettings = {
  processingFeeRate: 0.029, // 2.9%
  taxRate: 0.25, // 25%
  costRate: 45, // internal cost per hour
};

// Revenue source breakdown for Home
export const revenueBreakdown = {
  retainer: 10000,
  hourly: 3800,
  project: 1000,
};

// Workspace info
export const workspace = {
  name: 'Knaggs Design',
  url: 'knaggsdesigns.com',
  brandColor: '#5ea1bf',
  userName: 'Joe Knaggs',
  userEmail: 'joe@knaggsdesigns.com',
  userInitials: 'JK',
  role: 'Owner',
  timezone: 'America/New_York',
  currency: 'USD',
  locale: 'en-US',
  weeklyHoursTarget: 40,
  fiscalYearStart: 'January',
};

// Team members
export const teamMembers = [
  { id: 'jk', name: 'Joe Knaggs', email: 'joe@knaggsdesigns.com', role: 'Owner', initials: 'JK', joinedDate: 'Mar 2024', lastActive: 'Today' },
  { id: 'am', name: 'Alex Morgan', email: 'alex@knaggsdesigns.com', role: 'Admin', initials: 'AM', joinedDate: 'Jun 2024', lastActive: 'Yesterday' },
  { id: 'sk', name: 'Sam Kim', email: 'sam@knaggsdesigns.com', role: 'Member', initials: 'SK', joinedDate: 'Jan 2025', lastActive: '3 days ago' },
];

// Notification preferences
export const notificationPreferences = {
  retainerThreshold: 70,
  invoiceReminders: true,
  weeklyDigest: true,
  sessionSaved: false,
  clientActivity: true,
  budgetAlerts: true,
  emailNotifications: true,
  inAppNotifications: true,
};

// Integration connections
export const integrations = [
  { id: 'stripe', name: 'Stripe', description: 'Payment processing and invoicing', connected: true, icon: 'stripe', lastSync: '2 hours ago' },
  { id: 'quickbooks', name: 'QuickBooks', description: 'Accounting and bookkeeping', connected: true, icon: 'quickbooks', lastSync: '1 day ago' },
  { id: 'gcal', name: 'Google Calendar', description: 'Calendar sync for time tracking', connected: false, icon: 'gcal', lastSync: null },
  { id: 'slack', name: 'Slack', description: 'Team notifications and alerts', connected: false, icon: 'slack', lastSync: null },
  { id: 'notion', name: 'Notion', description: 'Project docs and client wikis', connected: false, icon: 'notion', lastSync: null },
];

// Invoice defaults
export const invoiceDefaults = {
  paymentTerms: 'Net 30',
  lateFeePercent: 1.5,
  defaultNotes: 'Thank you for your business. Payment is due within the terms specified above.',
  autoReminders: true,
  reminderDaysBefore: 3,
};

// Rate card
export const rateCard = [
  { id: 1, service: 'Design', rate: 150, unit: 'hour' },
  { id: 2, service: 'Development', rate: 175, unit: 'hour' },
  { id: 3, service: 'Strategy / Research', rate: 125, unit: 'hour' },
  { id: 4, service: 'Consulting', rate: 200, unit: 'hour' },
];
