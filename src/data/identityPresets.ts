// ── Identity presets ─────────────────────────────────────────────────

export type IdentityType =
  | 'designer'
  | 'developer'
  | 'copywriter'
  | 'consultant'
  | 'photographer'
  | 'videographer'
  | 'marketer'
  | 'other';

export interface WorkCategory {
  name: string;
  billable: boolean;
  isDefault: boolean;
}

const IDENTITY_CATEGORIES: Record<IdentityType, WorkCategory[]> = {
  designer: [
    { name: 'Design', billable: true, isDefault: true },
    { name: 'Branding', billable: true, isDefault: true },
    { name: 'UX Research', billable: true, isDefault: true },
    { name: 'Meetings', billable: true, isDefault: true },
    { name: 'Strategy', billable: true, isDefault: true },
    { name: 'Admin', billable: false, isDefault: true },
    { name: 'Prospecting', billable: false, isDefault: true },
  ],
  developer: [
    { name: 'Development', billable: true, isDefault: true },
    { name: 'Code Review', billable: true, isDefault: true },
    { name: 'Architecture', billable: true, isDefault: true },
    { name: 'Meetings', billable: true, isDefault: true },
    { name: 'DevOps', billable: true, isDefault: true },
    { name: 'Admin', billable: false, isDefault: true },
    { name: 'Prospecting', billable: false, isDefault: true },
  ],
  copywriter: [
    { name: 'Writing', billable: true, isDefault: true },
    { name: 'Editing', billable: true, isDefault: true },
    { name: 'Research', billable: true, isDefault: true },
    { name: 'Meetings', billable: true, isDefault: true },
    { name: 'Strategy', billable: true, isDefault: true },
    { name: 'Admin', billable: false, isDefault: true },
  ],
  consultant: [
    { name: 'Consulting', billable: true, isDefault: true },
    { name: 'Strategy', billable: true, isDefault: true },
    { name: 'Research', billable: true, isDefault: true },
    { name: 'Meetings', billable: true, isDefault: true },
    { name: 'Workshops', billable: true, isDefault: true },
    { name: 'Admin', billable: false, isDefault: true },
  ],
  photographer: [
    { name: 'Shooting', billable: true, isDefault: true },
    { name: 'Editing', billable: true, isDefault: true },
    { name: 'Retouching', billable: true, isDefault: true },
    { name: 'Meetings', billable: true, isDefault: true },
    { name: 'Admin', billable: false, isDefault: true },
  ],
  videographer: [
    { name: 'Filming', billable: true, isDefault: true },
    { name: 'Editing', billable: true, isDefault: true },
    { name: 'Motion Graphics', billable: true, isDefault: true },
    { name: 'Meetings', billable: true, isDefault: true },
    { name: 'Admin', billable: false, isDefault: true },
  ],
  marketer: [
    { name: 'Strategy', billable: true, isDefault: true },
    { name: 'Content', billable: true, isDefault: true },
    { name: 'Analytics', billable: true, isDefault: true },
    { name: 'Meetings', billable: true, isDefault: true },
    { name: 'Campaigns', billable: true, isDefault: true },
    { name: 'Admin', billable: false, isDefault: true },
  ],
  other: [
    { name: 'Client Work', billable: true, isDefault: true },
    { name: 'Meetings', billable: true, isDefault: true },
    { name: 'Strategy', billable: true, isDefault: true },
    { name: 'Admin', billable: false, isDefault: true },
    { name: 'Prospecting', billable: false, isDefault: true },
  ],
};

export function getCategoriesForIdentity(identity: IdentityType): WorkCategory[] {
  return IDENTITY_CATEGORIES[identity] || IDENTITY_CATEGORIES.other;
}

export function getCategoryNames(categories: WorkCategory[]): string[] {
  return categories.map(c => c.name);
}

export function mergeCategories(
  existing: WorkCategory[],
  incoming: WorkCategory[],
  mode: 'replace' | 'merge',
): WorkCategory[] {
  if (mode === 'replace') return incoming;
  const existingNames = new Set(existing.map(c => c.name.toLowerCase()));
  const merged = [...existing];
  for (const cat of incoming) {
    if (!existingNames.has(cat.name.toLowerCase())) {
      merged.push(cat);
    }
  }
  return merged;
}

export const IDENTITY_OPTIONS: { value: IdentityType; label: string; emoji: string }[] = [
  { value: 'designer', label: 'Designer', emoji: '🎨' },
  { value: 'developer', label: 'Developer', emoji: '💻' },
  { value: 'copywriter', label: 'Copywriter', emoji: '✍️' },
  { value: 'consultant', label: 'Consultant', emoji: '📊' },
  { value: 'photographer', label: 'Photographer', emoji: '📷' },
  { value: 'videographer', label: 'Videographer', emoji: '🎬' },
  { value: 'marketer', label: 'Marketer', emoji: '📈' },
  { value: 'other', label: 'Other', emoji: '🔧' },
];
