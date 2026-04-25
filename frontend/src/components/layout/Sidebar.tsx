import { NavLink } from 'react-router-dom';
import { authStorage } from '../../services/authStorage';
import './hr-layout.css';

type SidebarProps = {
  collapsed: boolean;
  onToggle: () => void;
};

type NavItem = {
  to: string;
  label: string;
  icon: string;
};

const Sidebar = ({ collapsed, onToggle }: SidebarProps) => {
  const user = authStorage.getUser();
  const dashboard = user?.dashboard ?? '';

  const roleLabel =
    dashboard === 'EMPLOYEE_DASHBOARD'
      ? 'Employee'
      : dashboard === 'HR_DASHBOARD'
        ? 'HR'
        : dashboard === 'ADMIN_DASHBOARD'
          ? 'Admin'
          : dashboard === 'MANAGER_DASHBOARD'
            ? 'Manager'
            : dashboard === 'DEPARTMENT_HEAD_DASHBOARD'
              ? 'Department Head'
              : dashboard === 'EXECUTIVE_DASHBOARD'
                ? 'Executive'
                : 'User';

  const navItems: NavItem[] =
    dashboard === 'EMPLOYEE_DASHBOARD'
      ? [{ to: '/employee/dashboard', label: 'Dashboard', icon: 'bi bi-grid-1x2' }]
      : [
          { to: '/dashboard', label: 'Dashboard', icon: 'bi bi-grid-1x2' },
          { to: '/hr/team', label: 'Team Management', icon: 'bi bi-people' },
          { to: '/hr/department', label: 'Departments', icon: 'bi bi-building' },
          { to: '/hr/employee', label: 'Employees', icon: 'bi bi-person' },
          { to: '/hr/feedback', label: '360 Feedback', icon: 'bi bi-chat-left-text' },
          { to: '/user-roles', label: 'User Roles', icon: 'bi bi-person-gear' },
          { to: '/role-permissions', label: 'Role Permissions', icon: 'bi bi-shield-check' },
          { to: '/permissions', label: 'Permissions', icon: 'bi bi-key' },
          { to: '/pip-updates', label: 'PIP Updates', icon: 'bi bi-clipboard-check' },
          { to: '/one-on-one-meetings', label: '1:1 Meetings', icon: 'bi bi-chat-dots' },
          { to: '/one-on-one-action-items', label: 'Action Items', icon: 'bi bi-list-check' },
          { to: '/notifications', label: 'Notifications', icon: 'bi bi-bell' },
          { to: '/hr/position/create', label: 'Create Position', icon: 'bi bi-briefcase' },
          { to: '/hr/position-level/create', label: 'Position Levels', icon: 'bi bi-diagram-3' },
          { to: '/hr/position/table', label: 'Positions Table', icon: 'bi bi-table' },
          { to: '/hr/performance-kpi/unit', label: 'KPI Units', icon: 'bi bi-speedometer2' },
          { to: '/hr/performance-kpi/category', label: 'KPI Categories', icon: 'bi bi-tags' },
          { to: '/hr/performance-kpi/item', label: 'KPI Items', icon: 'bi bi-card-checklist' },
          { to: '/hr/performance-kpi/form', label: 'KPI Forms', icon: 'bi bi-ui-checks-grid' },
        ];

  return (
    <aside className={`hr-sidebar ${collapsed ? 'collapsed' : ''}`}>
      <div className="hr-sidebar-brand">
        <div className="hr-sidebar-logo">E</div>

        {!collapsed && (
          <div className="hr-sidebar-brand-text">
            <h1>EPMS</h1>
            <p>Performance System</p>
          </div>
        )}
      </div>

      {!collapsed && (
        <div className="hr-role-chip">
          <small>CURRENT ROLE</small>
          <strong>{roleLabel}</strong>
        </div>
      )}

      <nav className="hr-sidebar-nav">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => `hr-nav-item ${isActive ? 'active' : ''}`}
            title={collapsed ? item.label : ''}
          >
            <i className={item.icon} />
            {!collapsed && <span className="hr-nav-label">{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      <button
        type="button"
        className={`hr-sidebar-collapse ${collapsed ? 'collapsed' : ''}`}
        onClick={onToggle}
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        <i className={`bi ${collapsed ? 'bi-chevron-right' : 'bi-chevron-left'}`} />
        {!collapsed && <span>Collapse Sidebar</span>}
      </button>
    </aside>
  );
};

export default Sidebar;