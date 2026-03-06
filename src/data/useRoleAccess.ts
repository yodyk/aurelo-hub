/**
 * Role-based access control hook.
 *
 * Roles:
 *   Owner  — full access to everything
 *   Admin  — full access except billing / workspace deletion
 *   Member — limited to time tracking, notes, and profile editing
 */

import { useAuth } from './AuthContext';

export interface RoleAccess {
  /** The raw workspace role string */
  role: string | null;

  /** True if the user's role is "Member" (not Owner/Admin) */
  isMember: boolean;

  /** Can view revenue, rates, earnings, and financial pages */
  canViewFinancials: boolean;

  /** Can access the Insights page */
  canViewInsights: boolean;

  /** Can access the Invoicing page */
  canViewInvoicing: boolean;

  /** Can access the Team page */
  canViewTeam: boolean;

  /** Can edit client details (name, rate, model, etc.) */
  canEditClients: boolean;

  /** Can manage projects (create, edit status, budget) */
  canManageProjects: boolean;

  /** Can view client notes and add notes */
  canViewNotes: boolean;

  /** Can log and edit own sessions */
  canLogSessions: boolean;
}

export function useRoleAccess(): RoleAccess {
  const { workspaceRole } = useAuth();
  const role = workspaceRole;
  const isMember = role === 'Member';

  return {
    role,
    isMember,
    canViewFinancials: !isMember,
    canViewInsights: !isMember,
    canViewInvoicing: !isMember,
    canViewTeam: !isMember,
    canEditClients: !isMember,
    canManageProjects: !isMember,
    canViewNotes: true, // All roles can view/add notes
    canLogSessions: true, // All roles can log sessions
  };
}

/** Describes what each role can and cannot do */
export const ROLE_DESCRIPTIONS: Record<string, { label: string; description: string; permissions: string[] }> = {
  Owner: {
    label: 'Owner',
    description: 'Full access to all workspace features, billing, and settings.',
    permissions: [
      'Log time & manage sessions',
      'View & edit clients and projects',
      'Access financial data & insights',
      'Create & send invoices',
      'Manage team members & roles',
      'Configure workspace settings & billing',
      'Delete workspace',
    ],
  },
  Admin: {
    label: 'Admin',
    description: 'Full access except billing and workspace deletion.',
    permissions: [
      'Log time & manage sessions',
      'View & edit clients and projects',
      'Access financial data & insights',
      'Create & send invoices',
      'Manage team members & roles',
      'Configure workspace settings',
    ],
  },
  Member: {
    label: 'Member',
    description: 'Focused on time tracking and collaboration. No access to financial data.',
    permissions: [
      'Log time & manage own sessions',
      'View clients and projects',
      'Add & view client notes',
      'Edit own profile',
    ],
  },
};
