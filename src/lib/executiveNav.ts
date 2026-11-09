import { NavGroup, NavItem } from '@/components/layout/Sidebar';

export const EXECUTIVE_PORTAL_NAME = "Headmaster & Executive Command";

export const ITEM_PERMISSION_MAP: Record<string, string[]> = {
  // System Administration (RBAC)
  '/admin/permissions': ['manage_permissions'],
  '/admin/settings': ['manage_settings'],

  // My Teaching Desk
  '/teacher': ['can_teach'],
  '/teacher/roster': ['can_teach'],
  '/teacher/attendance': ['can_teach'],
  '/teacher/lessons': ['can_teach'],
  '/teacher/ca-tracker': ['can_teach'],
  '/teacher/grading': ['can_teach'],
  '/teacher/remedial': ['can_teach'],
  '/teacher/appraisal': ['can_teach'],
  '/teacher/messages': ['can_teach', 'manage_communications'],
  '/teacher/assignments': ['manage_cbt'],

  // Executive & Academics
  '/headmaster': ['view_executive'],
  '/headmaster/inspections': ['view_executive'],
  '/headmaster/approvals': ['view_executive'],
  '/headmaster/bece-analytics': ['view_executive'],
  '/admin/academics': ['manage_academics'],
  '/admin/academics/calendar': ['manage_academics'],

  // Admissions & Students (SIS)
  '/admin/admissions': ['manage_admissions'],
  '/admin/students': ['manage_students'],
  '/headmaster/at-risk': ['manage_students'],
  '/headmaster/discipline': ['manage_students'],

  // Finance & Bursary
  '/admin/finance': ['manage_finance', 'view_finance'],

  // Faculty & Staff (HR)
  '/admin/staff': ['manage_staff'],
  '/headmaster/appraisals': ['manage_staff'],
  '/admin/hr': ['manage_staff'],

  // Logistics & Communications
  '/admin/communications': ['manage_communications'],
  '/admin/cbt': ['manage_cbt'],
};

export function isHrefAllowedByPermissions(
  href: string,
  role?: string,
  permissions?: string[]
): boolean {
  const cleanHref = href.split('?')[0];

  // Ensure ADMIN can never lock themselves out of the Roles & Permissions console
  if (cleanHref === '/admin/permissions' && role === 'ADMIN') {
    return true;
  }

  // If permissions array hasn't loaded yet (undefined), fall back to sensible role defaults
  if (!Array.isArray(permissions)) {
    if (cleanHref === '/admin/permissions') return role === 'ADMIN';
    if (cleanHref.startsWith('/teacher')) return role !== 'ADMIN' && role !== 'BURSAR';
    return true;
  }

  const requiredPerms = ITEM_PERMISSION_MAP[cleanHref];
  if (!requiredPerms || requiredPerms.length === 0) {
    return true;
  }

  return requiredPerms.some((perm) => permissions.includes(perm));
}

export function filterNavGroupsByPermissions(
  groups: NavGroup[],
  role?: string,
  permissions?: string[]
): NavGroup[] {
  return groups
    .map((group) => {
      const visibleItems = group.items.filter((item) =>
        isHrefAllowedByPermissions(item.href, role, permissions)
      );
      return {
        ...group,
        items: visibleItems,
      };
    })
    .filter((group) => group.items.length > 0);
}

export function filterNavItemsByPermissions(
  items: NavItem[],
  role?: string,
  permissions?: string[]
): NavItem[] {
  return items.filter((item) =>
    isHrefAllowedByPermissions(item.href, role, permissions)
  );
}

export const executiveNavGroups: NavGroup[] = [
  {
    title: "System Administration (RBAC)",
    items: [
      { name: 'Roles & Permissions Matrix', href: '/admin/permissions', icon: 'ph ph-shield-check' },
      { name: 'Institutional Settings & Audit', href: '/admin/settings', icon: 'ph ph-gear' },
    ]
  },
  {
    title: "My Teaching Desk",
    items: [
      { name: 'Classroom Cockpit', href: '/teacher', icon: 'ph ph-chalkboard-teacher' },
      { name: 'My Class Roster', href: '/teacher/roster', icon: 'ph ph-users-three' },
      { name: 'Dynamic CA Tracker', href: '/teacher/ca-tracker', icon: 'ph ph-chart-bar' },
      { name: 'SBA Gradebook', href: '/teacher/grading', icon: 'ph ph-exam' }
    ]
  },
  {
    title: "Executive & Academics",
    items: [
      { name: 'Headmaster Cockpit', href: '/headmaster', icon: 'ph ph-gauge' },
      { 
        name: 'Timetable & Class Streams', 
        href: '/admin/academics', 
        icon: 'ph ph-chalkboard-teacher',
        subItems: [
          { name: 'Class Streams (SIS)', href: '/admin/academics?tab=streams' },
          { name: 'Subject Curriculum', href: '/admin/academics?tab=subjects' },
          { name: 'Curriculum Mapping', href: '/admin/academics?tab=mapping' },
          { name: 'Timetable Studio', href: '/admin/academics?tab=timetable' },
          { name: 'Terminal Reports', href: '/admin/academics?tab=reports' }
        ]
      },
      { name: 'Academic Calendar', href: '/admin/academics/calendar', icon: 'ph ph-calendar' },
      { name: 'Lesson Plans & Inspections', href: '/headmaster/inspections', icon: 'ph ph-clipboard-text' },
      { name: 'Report Card Sign-Offs', href: '/headmaster/approvals', icon: 'ph ph-seal-check' },
      { name: 'BECE Mock Analytics', href: '/headmaster/bece-analytics', icon: 'ph ph-chart-line-up' },
    ]
  },
  {
    title: "Admissions & Students (SIS)",
    items: [
      { name: 'Admissions & Pipeline', href: '/admin/admissions', icon: 'ph ph-user-plus' },
      { name: 'Students & Parents (SIS)', href: '/admin/students', icon: 'ph ph-student' },
      { name: 'At-Risk Scholar Registry', href: '/headmaster/at-risk', icon: 'ph ph-warning-circle' },
      { name: 'Pastoral Care & Discipline', href: '/headmaster/discipline', icon: 'ph ph-shield-star' },
    ]
  },
  {
    title: "Finance & Bursary",
    items: [
      { name: 'Fee Ledger & Billing', href: '/admin/finance', icon: 'ph ph-wallet' },
    ]
  },
  {
    title: "Faculty & Staff (HR)",
    items: [
      { name: 'Faculty Directory & Allocations', href: '/admin/staff', icon: 'ph ph-users-three' },
      { name: 'Teacher Quality & Appraisals', href: '/headmaster/appraisals', icon: 'ph ph-certificate' },
      { name: 'Payroll & Leave Management', href: '/admin/hr', icon: 'ph ph-money' },
    ]
  },
  {
    title: "Logistics & Communications",
    items: [
      { name: 'Broadcasts & SMS Hub', href: '/admin/communications', icon: 'ph ph-broadcast' },
      { name: 'CBT Examination Center', href: '/admin/cbt', icon: 'ph ph-laptop' },
    ]
  }
];
