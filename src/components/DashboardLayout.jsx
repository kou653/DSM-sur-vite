import { Outlet } from "react-router-dom";

function DashboardLayout() {
  return (
    <div className="app-shell">
      <header className="app-header">
        <div>
          <p className="eyebrow">DSM</p>
          <h1>Plateforme de suivi-evaluation</h1>
        </div>
      </header>

      <main className="app-main">
        <Outlet />
      </main>
    </div>
  );
}

export default DashboardLayout;
