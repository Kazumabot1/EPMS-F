import { NavLink, Navigate, Outlet } from 'react-router-dom';
import { authStorage } from '../../services/authStorage';
import './employee-layout.css';

const EmployeeLayout = () => {
  const user = authStorage.getUser();
  const token = authStorage.getAccessToken();

  if (!user || !token) {
    return <Navigate to="/login" replace />;
  }

  if (user.dashboard !== 'EMPLOYEE_DASHBOARD') {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="employee-layout">
      <header className="employee-layout-header">
        <div>
          <div className="employee-layout-badge">EPMS</div>
          <h1>Employee Dashboard</h1>
          <p>Welcome back, {user.fullName || 'Employee'}.</p>
        </div>

        <div className="employee-layout-header-actions">
          <nav className="employee-layout-nav">
            <NavLink
              className={({ isActive }) => `employee-layout-nav-link ${isActive ? 'active' : ''}`}
              to="/employee/dashboard"
            >
              Workforce
            </NavLink>
            <NavLink
              className={({ isActive }) => `employee-layout-nav-link ${isActive ? 'active' : ''}`}
              to="/feedback/my-tasks"
            >
              My Feedback Tasks
            </NavLink>
            <NavLink
              className={({ isActive }) => `employee-layout-nav-link ${isActive ? 'active' : ''}`}
              to="/feedback/my-result"
            >
              My Feedback Results
            </NavLink>
          </nav>

          <button
            className="employee-layout-logout"
            onClick={() => {
              authStorage.clearSession();
              window.location.href = '/login';
            }}
          >
            Logout
          </button>
        </div>
      </header>

      <main className="employee-layout-main">
        <Outlet />
      </main>
    </div>
  );
};

export default EmployeeLayout;
