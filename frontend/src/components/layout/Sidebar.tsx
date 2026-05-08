import { useEffect, useMemo, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { roleNavigation, resolveUserRole, displayRoleName } from '../../config/roleNavigation';
import type { NavItem, UserRole } from '../../config/roleNavigation';

type SidebarProps = {
  collapsed: boolean;
  onToggle: () => void;
  variant?: 'admin' | 'hr';
};

const toBootstrapIcon = (icon: string) => (icon.startsWith('bi ') ? icon : `bi ${icon}`);

const Sidebar = ({ collapsed, onToggle, variant }: SidebarProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const resolvedRole = resolveUserRole(user);

  const role: UserRole = variant === 'admin' ? 'Admin' : variant === 'hr' ? 'HR' : resolvedRole;
  const roleLabel = displayRoleName(role);

  const navItems = useMemo(() => roleNavigation[role] ?? roleNavigation.HR, [role]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const hasActiveChild = (item: NavItem) =>
    item.children?.some((child) => location.pathname.startsWith(child.path)) ?? false;

  useEffect(() => {
    setExpanded((previous) => {
      const next = new Set(previous);
      navItems.forEach((item) => {
        if (hasActiveChild(item)) next.add(item.path);
      });
      return next;
    });
  }, [location.pathname, navItems]);

  const isParentActive = (item: NavItem) =>
    location.pathname.startsWith(item.path) || hasActiveChild(item);

  const toggleParent = (item: NavItem) => {
    if (!item.children?.length) {
      navigate(item.path);
      return;
    }

    setExpanded((previous) => {
      const next = new Set(previous);
      if (next.has(item.path)) next.delete(item.path);
      else next.add(item.path);
      return next;
    });
  };

  return (
    <aside className={`hr-sidebar ${collapsed ? 'collapsed' : ''}`}>
      <div className="hr-sidebar-top">
        <div className="hr-brand">
          <div className="hr-brand-mark">E</div>
          {!collapsed && (
            <div className="hr-brand-copy">
              <h2>EPMS</h2>
              <p>Performance System</p>
            </div>
          )}
        </div>
        {!collapsed && <div className="hr-sidebar-top-divider" />}
      </div>

      {!collapsed && (
        <div className="hr-role-chip">
          <small>CURRENT ROLE</small>
          <strong>{roleLabel}</strong>
        </div>
      )}

      <nav className="hr-nav">
        {navItems.map((item) => {
          const isExpanded = expanded.has(item.path);
          const parentActive = isParentActive(item);

          if (!item.children?.length) {
            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.end}
                className={({ isActive }) => `hr-nav-link ${isActive ? 'active' : ''}`}
                title={collapsed ? item.label : undefined}
              >
                <i className={toBootstrapIcon(item.icon)} />
                {!collapsed && <span>{item.label}</span>}
              </NavLink>
            );
          }

          return (
            <div key={item.path} className="hr-nav-group">
              <button
                type="button"
                className={`hr-nav-link hr-nav-group-toggle ${parentActive ? 'active' : ''}`}
                onClick={() => toggleParent(item)}
                title={collapsed ? item.label : undefined}
              >
                <i className={toBootstrapIcon(item.icon)} />
                {!collapsed && (
                  <>
                    <span>{item.label}</span>
                    <i className={`bi ${isExpanded ? 'bi-chevron-down' : 'bi-chevron-right'} hr-submenu-caret`} />
                  </>
                )}
              </button>

              {!collapsed && isExpanded && (
                <div className="hr-submenu">
                  {item.children.map((child) => (
                    <NavLink
                      key={child.path}
                      to={child.path}
                      end={child.end}
                      className={({ isActive }) => `hr-submenu-link ${isActive ? 'active' : ''}`}
                    >
                      <i className={toBootstrapIcon(child.icon)} />
                      <span>{child.label}</span>
                    </NavLink>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      <div className="hr-sidebar-footer">
        <button
          type="button"
          className="hr-sidebar-collapse"
          onClick={onToggle}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <i className={`bi ${collapsed ? 'bi-chevron-right' : 'bi-chevron-left'}`} />
          {!collapsed && <span>Collapse</span>}
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
