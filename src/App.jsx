import { Suspense, lazy } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import DashboardLayout from "./components/DashboardLayout.jsx";
import ProjectAccessGuard from "./components/guards/ProjectAccessGuard.jsx";
import ProtectedRoute from "./components/guards/ProtectedRoute.jsx";
import RoleGuard from "./components/guards/RoleGuard.jsx";
import ProjectLayout from "./components/ProjectLayout.jsx";

const AccessDeniedPage = lazy(() => import("./pages/AccessDeniedPage.jsx"));
const AccountPage = lazy(() => import("./pages/AccountPage.jsx"));
const AiAnalysisPage = lazy(() => import("./pages/AiAnalysisPage.jsx"));
const CooperativesPage = lazy(() => import("./pages/CooperativesPage.jsx"));
const DashboardPage = lazy(() => import("./pages/DashboardPage.jsx"));
const EspecesPage = lazy(() => import("./pages/EspecesPage.jsx"));
const EvolutionPage = lazy(() => import("./pages/EvolutionPage.jsx"));
const EvolutionDetailsPage = lazy(() => import("./pages/EvolutionDetailsPage.jsx"));
const LoginPage = lazy(() => import("./pages/LoginPage.jsx"));
const MonitoringPage = lazy(() => import("./pages/MonitoringPage.jsx"));
const MapPage = lazy(() => import("./pages/MapPage.jsx"));
const NotFoundPage = lazy(() => import("./pages/NotFoundPage.jsx"));
const ParcellesPage = lazy(() => import("./pages/ParcellesPage.jsx"));
const ParcelleDetailsPage = lazy(() => import("./pages/ParcelleDetailsPage.jsx"));
const ProjectListPage = lazy(() => import("./pages/ProjectListPage.jsx"));
const UsersPage = lazy(() => import("./pages/UsersPage.jsx"));

function RouteFallback() {
  return (
    <section className="users-page">
      <p className="muted-text">Chargement de la page...</p>
    </section>
  );
}

function App() {
  return (
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/access-denied" element={<AccessDeniedPage />} />

        <Route element={<ProtectedRoute />}>
          <Route element={<DashboardLayout />}>
            <Route path="/dashboard" element={<ProjectListPage />} />
            <Route path="/dashboard/compte" element={<AccountPage />} />

            <Route element={<RoleGuard allowedRoles={["administrateur", "agent terrain"]} />}>
              <Route path="/dashboard/utilisateurs" element={<UsersPage />} />
              <Route path="/dashboard/especes" element={<EspecesPage />} />
            </Route>

            <Route path="/dashboard/projet/:projectId" element={<ProjectAccessGuard />}>
              <Route element={<ProjectLayout />}>
                <Route index element={<Navigate to="accueil" replace />} />
                <Route path="accueil" element={<DashboardPage />} />
                <Route path="parcelles">
                  <Route index element={<ParcellesPage />} />
                  <Route path=":parcelleId" element={<ParcelleDetailsPage />} />
                </Route>
                <Route path="carte" element={<MapPage />} />
                <Route path="cooperatives" element={<CooperativesPage />} />
                <Route path="evolution">
                  <Route index element={<EvolutionPage />} />
                  <Route path=":parcelleId" element={<EvolutionDetailsPage />} />
                </Route>

                <Route path="analyse-ia" element={<AiAnalysisPage />} />
                <Route element={<RoleGuard allowedRoles={["administrateur"]} />}>
                  <Route path="monitoring" element={<MonitoringPage />} />
                  <Route path="utilisateurs" element={<UsersPage />} />
                </Route>
              </Route>
            </Route>
          </Route>
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  );
}

export default App;
