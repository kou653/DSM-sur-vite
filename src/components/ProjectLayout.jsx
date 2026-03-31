import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../contexts/auth-context.js";

const projectMenu = [
  { to: "accueil", label: "Tableau de bord" },
  { to: "parcelles", label: "Parcelles" },
  { to: "plants", label: "Plants" },
  { to: "especes", label: "Especes" },
  { to: "carte", label: "Carte" },
  { to: "statistiques", label: "Statistiques" },
];

const adminMenu = [
  { to: "monitoring", label: "Monitoring" },
  { to: "cooperatives", label: "Gestion des cooperatives" },
  { to: "utilisateurs", label: "Gestion des utilisateurs" },
];

function ProjectLayout() {
  const { role, selectedProjectId } = useAuth();
  const visibleMenu =
    ["admin", "administrateur"].includes(role) ? [...projectMenu, ...adminMenu] : projectMenu;

  return (
    <div className="project-layout">
      <aside className="project-sidebar">
        <p className="eyebrow">Projet selectionne</p>
        <h2>{selectedProjectId}</h2>

        <nav className="project-nav" aria-label="Navigation projet">
          {visibleMenu.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                isActive ? "nav-link nav-link-active" : "nav-link"
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <section className="project-content">
        <Outlet />
      </section>
    </div>
  );
}

export default ProjectLayout;
