import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import type { UserRole } from '../config/roleNavigation';
import { dashboardPathByRole, resolveUserRole } from '../config/roleNavigation';

interface ProtectedRouteProps {
  allowedRoles?: UserRole[];
}

const ProtectedRoute = ({ allowedRoles }: ProtectedRouteProps) => {
  const { isAuthenticated, loading, user } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (user?.mustChangePassword && location.pathname !== '/change-password') {
    return <Navigate to="/change-password" replace />;
  }

  if (allowedRoles?.length) {
    const currentRole = resolveUserRole(user);

    if (!allowedRoles.includes(currentRole)) {
      return <Navigate to={dashboardPathByRole[currentRole]} replace />;
    }
  }

  return <Outlet />;
};

export default ProtectedRoute;