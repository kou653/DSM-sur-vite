import { Navigate, Route, Routes } from "react-router-dom";
import DashboardLayout from "./components/DashboardLayout.jsx";
import ProjectAccessGuard from "./components/guards/ProjectAccessGuard.jsx";
import ProtectedRoute from "./components/guards/ProtectedRoute.jsx";
import RoleGuard from "./components/guards/RoleGuard.jsx";
import AccessDeniedPage from "./pages/AccessDeniedPage.jsx";
import AccountPage from "./pages/AccountPage.jsx";
import AiAnalysisPage from "./pages/AiAnalysisPage.jsx";
import CooperativesPage from "./pages/CooperativesPage.jsx";
import ProjectLayout from "./components/ProjectLayout.jsx";
import DashboardPage from "./pages/DashboardPage.jsx";
import EspecesPage from "./pages/EspecesPage.jsx";
import EvolutionPage from "./pages/EvolutionPage.jsx";
import EvolutionDetailsPage from "./pages/EvolutionDetailsPage.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import MonitoringPage from "./pages/MonitoringPage.jsx";
import MapPage from "./pages/MapPage.jsx";
import NotFoundPage from "./pages/NotFoundPage.jsx";
import ParcellesPage from "./pages/ParcellesPage.jsx";
import ParcelleDetailsPage from "./pages/ParcelleDetailsPage.jsx";
// import PlantDocumentationsPage from "./pages/PlantDocumentationsPage.jsx";
import ProjectListPage from "./pages/ProjectListPage.jsx";
import UsersPage from "./pages/UsersPage.jsx";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/access-denied" element={<AccessDeniedPage />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<DashboardLayout />}>
          <Route path="/dashboard" element={<ProjectListPage />} />
          <Route path="/dashboard/compte" element={<AccountPage />} />

          <Route element={<RoleGuard allowedRoles={["administrateur"]} />}>
            <Route path="/dashboard/utilisateurs" element={<UsersPage />} />
          </Route>

          <Route path="/dashboard/projet/:projectId" element={<ProjectAccessGuard />}>
            <Route element={<ProjectLayout />}>
              <Route index element={<Navigate to="accueil" replace />} />
              <Route path="accueil" element={<DashboardPage />} />
              <Route path="parcelles">
                <Route index element={<ParcellesPage />} />
                <Route path=":parcelleId" element={<ParcelleDetailsPage />} />
                {/* <Route
                  path=":parcelleId/documentations"
                  element={<PlantDocumentationsPage />}
                /> */}
              </Route>
              <Route path="carte" element={<MapPage />} />
              <Route path="cooperatives" element={<CooperativesPage />} />
              <Route path="evolution">
                <Route index element={<EvolutionPage />} />
                <Route path=":parcelleId" element={<EvolutionDetailsPage />} />
              </Route>

              <Route path="analyse-ia" element={<AiAnalysisPage />} />
              <Route element={<RoleGuard allowedRoles={["administrateur"]} />}>
                <Route path="especes" element={<EspecesPage />} />
                <Route path="monitoring" element={<MonitoringPage />} />
                <Route path="utilisateurs" element={<UsersPage />} />
              </Route>
            </Route>
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

export default App;
