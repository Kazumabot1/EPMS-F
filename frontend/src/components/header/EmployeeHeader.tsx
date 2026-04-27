import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { UserRole } from '../../config/roleNavigation';
import { useAuth } from '../../contexts/AuthContext';

interface UserLike {
  fullName?: string;
  email?: string;
  employeeCode?: string;
  position?: string;
}

interface EmployeeHeaderProps {
  user?: UserLike | null;
  role?: UserRole;
  collapsed: boolean;
}

const getInitials = (name: string) => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return 'JM';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
};

const EmployeeHeader = ({ user, role = 'Employee', collapsed }: EmployeeHeaderProps) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { logout } = useAuth();

  const displayName = user?.fullName?.trim() || 'John Mitchell';
  const initials = getInitials(displayName);
  const email = user?.email || 'john.mitchell@epms.local';
  const employeeCode = user?.employeeCode || 'EMP-0001';
  const position = user?.position || 'Employee';

  const closeMenu = useCallback(() => setMenuOpen(false), []);

  useEffect(() => {
    if (!menuOpen) return;

    const onDocMouseDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };

    document.addEventListener('mousedown', onDocMouseDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onDocMouseDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [menuOpen]);

  const handleLogout = () => {
    closeMenu();
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <header className={`employee-header ${collapsed ? 'collapsed' : ''}`}>
      <div className="employee-header-search">
        <i className="bi bi-search" />
        <input
          type="text"
          placeholder="Search employees, KPIs, appraisals..."
        />
      </div>

      <div className="employee-header-actions">
        <button
          type="button"
          aria-label="Notifications"
          className="employee-header-notification"
        >
          <i className="bi bi-bell" />
          <span />
        </button>

        <div className="employee-header-divider" />

        <div className="employee-user-menu" ref={menuRef}>
          <button
            type="button"
            className="employee-user-chip"
            onClick={() => setMenuOpen((prev) => !prev)}
            aria-expanded={menuOpen}
            aria-haspopup="menu"
            aria-controls="employee-user-dropdown"
          >
            <span className="employee-user-avatar">{initials}</span>
            <span className="employee-user-meta">
              <span>{displayName}</span>
              <small>{role}</small>
            </span>
            <i className={`bi ${menuOpen ? 'bi-chevron-up' : 'bi-chevron-down'}`} />
          </button>

          {menuOpen && (
            <div className="employee-user-dropdown" id="employee-user-dropdown" role="menu">
              <button
                type="button"
                className="employee-user-dropdown-item"
                onClick={() => {
                  closeMenu();
                  setProfileOpen(true);
                }}
              >
                <i className="bi bi-person" />
                Profile
              </button>
              <button
                type="button"
                className="employee-user-dropdown-item"
                onClick={() => {
                  closeMenu();
                  navigate('/employee/dashboard');
                }}
              >
                <i className="bi bi-house-door" />
                Dashboard
              </button>
              <button
                type="button"
                className="employee-user-dropdown-item employee-user-dropdown-item-danger"
                onClick={handleLogout}
              >
                <i className="bi bi-box-arrow-right" />
                Log out
              </button>
            </div>
          )}
        </div>
      </div>

      {profileOpen && (
        <div className="employee-profile-modal-overlay" role="presentation" onClick={() => setProfileOpen(false)}>
          <div
            className="employee-profile-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="employee-profile-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="employee-profile-modal-head">
              <h2 id="employee-profile-title">Employee Profile</h2>
              <button
                type="button"
                className="employee-profile-modal-close"
                aria-label="Close profile modal"
                onClick={() => setProfileOpen(false)}
              >
                <i className="bi bi-x-lg" />
              </button>
            </div>

            <div className="employee-profile-summary">
              <span className="employee-user-avatar">{initials}</span>
              <div>
                <strong>{displayName}</strong>
                <p>{role}</p>
              </div>
            </div>

            <div className="employee-profile-grid">
              <div>
                <label>Full Name</label>
                <span>{displayName}</span>
              </div>
              <div>
                <label>Employee Code</label>
                <span>{employeeCode}</span>
              </div>
              <div>
                <label>Email</label>
                <span>{email}</span>
              </div>
              <div>
                <label>Position</label>
                <span>{position}</span>
              </div>
              <div>
                <label>Role</label>
                <span>{role}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

export default EmployeeHeader;
