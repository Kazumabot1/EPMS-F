import { useNavigate } from 'react-router-dom';

type HeaderProps = {
  collapsed: boolean;
};

const Header = ({ collapsed }: HeaderProps) => {
  const navigate = useNavigate();
  const user = authStorage.getUser();
  const email = user?.email ?? 'hr@company.com';
  const userName = user?.fullName ?? 'User';
  const primaryRole = user?.roles?.[0] ?? 'User';

  const handleLogout = () => {
    authStorage.clearSession();
    navigate('/login', { replace: true });
  };

  return (
    <header className={`hr-header ${collapsed ? 'collapsed' : ''}`}>
      <div className="hr-header-search">
        <i className="bi bi-search" />
        <input type="text" placeholder="Search employees, KPI, appraisals..." />
      </div>

      <div className="hr-header-actions">
        <button type="button" className="hr-icon-button hr-notification" aria-label="Notifications">
          <i className="bi bi-bell" />
          <span>1</span>
        </button>

        <div className="hr-user-chip">
          <span className="hr-user-avatar">{email.charAt(0).toUpperCase()}</span>
          <div>
            <strong>{userName}</strong>
            <small>{primaryRole}</small>
          </div>
          <i className="bi bi-chevron-down" />
        </div>

          {isUserMenuOpen && (
            <div id="hr-user-dropdown-menu" className="hr-user-dropdown" role="menu" aria-label="User menu">
              <button
                ref={profileMenuItemRef}
                type="button"
                className="hr-user-dropdown-item"
                role="menuitem"
                onClick={handleProfile}
                onKeyDown={(event) => {
                  if (event.key === 'ArrowDown') {
                    event.preventDefault();
                    moveFocus(1);
                  }
                  if (event.key === 'ArrowUp') {
                    event.preventDefault();
                    moveFocus(-1);
                  }
                }}
              >
                <i className="bi bi-person" />
                <span>Profile</span>
              </button>
              <button
                ref={logoutMenuItemRef}
                type="button"
                className="hr-user-dropdown-item hr-user-dropdown-item-danger"
                role="menuitem"
                onClick={handleLogout}
                onKeyDown={(event) => {
                  if (event.key === 'ArrowDown') {
                    event.preventDefault();
                    moveFocus(1);
                  }
                  if (event.key === 'ArrowUp') {
                    event.preventDefault();
                    moveFocus(-1);
                  }
                }}
              >
                <i className="bi bi-box-arrow-right" />
                <span>Logout</span>
              </button>
            </div>
          )}
        </div>


      </div>
    </header>
  );
};

export default Header;
