import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../../contexts/auth-context.js";

function RoleGuard({ allowedRoles }) {
  const { role } = useAuth();

  if (!allowedRoles.includes(role)) {
    return <Navigate to="/access-denied" replace />;
  }

  return <Outlet />;
}

export default RoleGuard;
