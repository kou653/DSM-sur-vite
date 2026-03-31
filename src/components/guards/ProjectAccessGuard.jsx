import { useEffect } from "react";
import { Navigate, Outlet, useParams } from "react-router-dom";
import { useAuth } from "../../contexts/auth-context.js";

function ProjectAccessGuard() {
  const { projectId } = useParams();
  const { accessibleProjectIds, role, setSelectedProjectId } = useAuth();
  const numericProjectId = Number(projectId);
  const hasAccess =
    role === "administrateur" || accessibleProjectIds.includes(numericProjectId);

  useEffect(() => {
    if (!Number.isNaN(numericProjectId) && hasAccess) {
      setSelectedProjectId(numericProjectId);
    }
  }, [hasAccess, numericProjectId, setSelectedProjectId]);

  if (Number.isNaN(numericProjectId)) {
    return <Navigate to="/dashboard" replace />;
  }

  if (!hasAccess) {
    return <Navigate to="/access-denied" replace />;
  }

  return <Outlet />;
}

export default ProjectAccessGuard;
