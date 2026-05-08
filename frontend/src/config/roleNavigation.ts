export type UserRole =
  | 'Employee'
  | 'Admin'
  | 'HR'
  | 'DepartmentHead'
  | 'Manager'
  | 'ProjectManager'
  | 'Executive';

export interface NavItem {
  label: string;
  path: string;
  icon: string;
  end?: boolean;
  children?: NavItem[];
}

export interface UserLike {
  roles?: string[];
  dashboard?: string;
}

export const roleNavigation: Record<UserRole, NavItem[]> = {
  Employee: [
    { label: 'My Dashboard', path: '/employee/dashboard', icon: 'bi-columns-gap', end: true },
    { label: 'My KPIs', path: '/employee/kpis', icon: 'bi-bullseye' },
    {
      label: 'Performance Appraisal Cycle',
      path: '/employee/performance-appraisal-cycle',
      icon: 'bi-clipboard-check',
    },
    { label: 'Self-Assessment', path: '/employee/self-assessment', icon: 'bi-pencil-square' },
    { label: 'My Feedback', path: '/employee/feedback', icon: 'bi-chat-dots' },
    { label: 'One-on-Ones', path: '/employee/one-on-ones', icon: 'bi-calendar-check' },
    {
      label: 'PIP',
      path: '/pip',
      icon: 'bi-clipboard2-pulse',
      children: [{ label: 'Past Plans', path: '/pip/past-plans', icon: 'bi-clock-history' }],
    },
    { label: 'Notifications', path: '/employee/notifications', icon: 'bi-bell' },
  ],

  Admin: [
    { label: 'Admin Dashboard', path: '/admin/dashboard', icon: 'bi-shield-lock', end: true },
    { label: 'User Accounts', path: '/admin/users', icon: 'bi-person-plus' },
    { label: 'Import Accounts', path: '/admin/employee/import', icon: 'bi-upload' },
    {
      label: 'Access Control',
      path: '/user-roles',
      icon: 'bi-shield-lock',
      children: [
        { label: 'User Roles', path: '/user-roles', icon: 'bi-person-gear' },
        { label: 'Role Permissions', path: '/role-permissions', icon: 'bi-shield-check' },
        { label: 'Permissions', path: '/permissions', icon: 'bi-key' },
      ],
    },
  ],

  HR: [
    { label: 'Dashboard', path: '/dashboard', icon: 'bi-grid-1x2', end: true },
    { label: 'Profile', path: '/hr/profile', icon: 'bi-person' },
    { label: 'Employees', path: '/hr/employee', icon: 'bi-people' },
    { label: 'Teams', path: '/hr/team', icon: 'bi-people-fill' },
    { label: 'Departments', path: '/hr/department', icon: 'bi-building' },
    { label: 'Assessment Scores', path: '/hr/assessment-scores', icon: 'bi-clipboard-data' },
    { label: '360 Feedback', path: '/hr/feedback', icon: 'bi-chat-dots' },
    {
      label: 'Performance Appraisal Cycle',
      path: '/hr/appraisal',
      icon: 'bi-clipboard2-check',
      children: [
        { label: 'Form Template Create', path: '/hr/appraisal/templates', icon: 'bi-ui-checks-grid' },
        { label: 'Template Form Records', path: '/hr/appraisal/template-records', icon: 'bi-card-checklist' },
        { label: 'Appraisal Create', path: '/hr/appraisal/create', icon: 'bi-plus-square' },
        { label: 'Appraisal Create Records', path: '/hr/appraisal/create-records', icon: 'bi-calendar-range' },
        { label: 'PM + Dept Review Check', path: '/hr/appraisal/review-check', icon: 'bi-person-check' },
      ],
    },
    {
      label: 'PIP',
      path: '/pip',
      icon: 'bi-clipboard2-pulse',
      children: [{ label: 'Past Plans', path: '/pip/past-plans', icon: 'bi-clock-history' }],
    },
  ],

  DepartmentHead: [
    { label: 'Department Dashboard', path: '/department-head/dashboard', icon: 'bi-building-check', end: true },
    { label: 'Assessment Scores', path: '/hr/assessment-scores', icon: 'bi-clipboard-data' },
    {
      label: 'Performance Review',
      path: '/department-head/performance-review',
      icon: 'bi-clipboard-check',
      children: [
        { label: 'PM Review Check', path: '/department-head/performance-review/check', icon: 'bi-person-check' },
        { label: 'Review Check Record', path: '/department-head/performance-review/records', icon: 'bi-clock-history' },
      ],
    },
    {
      label: 'PIP',
      path: '/pip',
      icon: 'bi-clipboard2-pulse',
      children: [
        { label: 'Create', path: '/pip/create', icon: 'bi-plus-square' },
        { label: 'Past Plans', path: '/pip/past-plans', icon: 'bi-clock-history' },
      ],
    },
  ],

  Manager: [
    { label: 'Manager Dashboard', path: '/manager/dashboard', icon: 'bi-person-workspace', end: true },
    { label: 'Team Appraisals', path: '/manager/appraisals', icon: 'bi-clipboard-check' },
    { label: 'Team Reports', path: '/manager/reports', icon: 'bi-file-earmark-bar-graph' },
    {
      label: 'PIP',
      path: '/pip',
      icon: 'bi-clipboard2-pulse',
      children: [
        { label: 'Create', path: '/pip/create', icon: 'bi-plus-square' },
        { label: 'Past Plans', path: '/pip/past-plans', icon: 'bi-clock-history' },
      ],
    },
  ],

  ProjectManager: [
    { label: 'Project Dashboard', path: '/project-manager/dashboard', icon: 'bi-kanban', end: true },
    {
      label: 'Performance Review',
      path: '/project-manager/performance-review',
      icon: 'bi-clipboard-check',
      children: [
        { label: 'Employee Performance Review', path: '/project-manager/performance-review/employees', icon: 'bi-person-lines-fill' },
        { label: 'Review History List', path: '/project-manager/performance-review/history', icon: 'bi-clock-history' },
      ],
    },
    { label: 'Project Performance', path: '/project-manager/performance', icon: 'bi-graph-up-arrow' },
    { label: 'Stakeholder Feedback', path: '/project-manager/feedback', icon: 'bi-chat-square-text' },
    { label: 'Project Reports', path: '/project-manager/reports', icon: 'bi-file-earmark-bar-graph' },
  ],

  Executive: [
    { label: 'Executive Dashboard', path: '/executive/dashboard', icon: 'bi-building', end: true },
    { label: 'Reports', path: '/executive/reports', icon: 'bi-bar-chart-line' },
  ],
};

const normalizeRoleName = (role: string) =>
  role
    .replace(/^ROLE_/i, '')
    .replace(/[\s-]+/g, '_')
    .toUpperCase();

export const resolveUserRole = (user?: UserLike | null): UserRole => {
  if (!user) return 'Employee';

  const normalizedRoles = (user.roles ?? []).map(normalizeRoleName);
  const dashboard = user.dashboard ?? '';

  if (normalizedRoles.includes('ADMIN') || dashboard === 'ADMIN_DASHBOARD') return 'Admin';
  if (
    normalizedRoles.includes('DEPARTMENT_HEAD') ||
    normalizedRoles.includes('DEPARTMENTHEAD') ||
    dashboard === 'DEPARTMENT_HEAD_DASHBOARD'
  ) return 'DepartmentHead';
  if (normalizedRoles.includes('HR') || dashboard === 'HR_DASHBOARD') return 'HR';
  if (
    normalizedRoles.includes('PROJECT_MANAGER') ||
    normalizedRoles.includes('PROJECTMANAGER') ||
    dashboard === 'PROJECT_MANAGER_DASHBOARD'
  ) return 'ProjectManager';
  if (normalizedRoles.includes('MANAGER') || dashboard === 'MANAGER_DASHBOARD') return 'Manager';
  if (normalizedRoles.includes('CEO') || normalizedRoles.includes('EXECUTIVE') || dashboard === 'EXECUTIVE_DASHBOARD') return 'Executive';

  return 'Employee';
};

export const dashboardPathByRole: Record<UserRole, string> = {
  Employee: '/employee/dashboard',
  Admin: '/admin/dashboard',
  HR: '/dashboard',
  DepartmentHead: '/department-head/dashboard',
  Manager: '/manager/dashboard',
  ProjectManager: '/project-manager/dashboard',
  Executive: '/executive/dashboard',
};

export const displayRoleName = (role: UserRole) => {
  if (role === 'DepartmentHead') return 'Department Head';
  if (role === 'ProjectManager') return 'Project Manager';
  return role;
};
