import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../../contexts/auth-context.js";

function ProtectedRoute() {
  const location = useLocation();
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <section className="panel">
        <p>Chargement de la session...</p>
      </section>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <Outlet />;
}

export default ProtectedRoute;
