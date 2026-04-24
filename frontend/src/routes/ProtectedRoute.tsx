import { Navigate, Outlet } from "react-router-dom";
import { authStorage } from "../services/authStorage";

const ProtectedRoute = () => {
  const token = authStorage.getAccessToken();

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;