import {
  BarChart3,
  Building2,
  Camera,
  ChevronDown,
  LayoutDashboard,
  LogOut,
  Map,
  Menu,
  ScanSearch,
  Sprout,
  TreePine,
  UserCircle2,
  Users,
  X,
} from "lucide-react";
import { useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/auth-context.js";

function DashboardLayout() {
  const { role, selectedProjectId, user, logout } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const location = useLocation();

  const isProjectRoute = /^\/dashboard\/projet\/\d+(\/|$)/.test(location.pathname);
  const projectBasePath = selectedProjectId
    ? `/dashboard/projet/${selectedProjectId}`
    : null;

  const projectItems =
    isProjectRoute && projectBasePath
      ? [
        {
          to: `${projectBasePath}/accueil`,
          label: "Vue d'ensemble",
          icon: LayoutDashboard,
        },
        {
          to: `${projectBasePath}/parcelles`,
          label: "Parcelles",
          icon: Sprout,
        },
        {
          to: `${projectBasePath}/plants`,
          label: "Plants",
          icon: ScanSearch,
        },
        {
          to: `${projectBasePath}/especes`,
          label: "Especes",
          icon: TreePine,
        },
        {
          to: `${projectBasePath}/carte`,
          label: "Carte",
          icon: Map,
        },
        {
          to: `${projectBasePath}/statistiques`,
          label: "Statistiques",
          icon: BarChart3,
        },

        ...(role === "administrateur"
          ? [
            {
              to: `${projectBasePath}/monitoring`,
              label: "Monitoring",
              icon: ScanSearch,
            },
          ]
          : []),
        ...(role !== "commanditaire"
          ? [
            {
              to: `${projectBasePath}/evolution`,
              label: "Evolution",
              icon: Camera,
            },
          ]
          : []),
        {
          to: `${projectBasePath}/cooperatives`,
          label: "Cooperatives",
          icon: Building2,
        },

      ]
      : [];

  const navigationSections = [
    {
      title: "Principal",
      items: [
        {
          to: "/dashboard",
          label: "Tableau de bord",
          icon: LayoutDashboard,
          end: true,
        },
      ],
    },
    ...(projectItems.length > 0
      ? [
        {
          title: `Projet ${selectedProjectId}`,
          items: projectItems,
        },
      ]
      : []),
    ...(role === "administrateur"
      ? [
        {
          title: "Administration",
          items: [
            {
              to: "/dashboard/utilisateurs",
              label: "Utilisateurs",
              icon: Users,
            },
          ],
        },
      ]
      : []),
    {
      title: "Compte",
      items: [
        {
          to: "/dashboard",
          label: "Mon compte",
          icon: UserCircle2,
        },
      ],
    },
  ];

  return (
    <div
      className={
        isSidebarOpen
          ? "dashboard-shell"
          : "dashboard-shell dashboard-shell-sidebar-closed"
      }
    >
      <aside className="dashboard-sidebar">
        <div className="dashboard-sidebar-header">
          <div className="dashboard-brand">
            <div className="dashboard-brand-mark" aria-hidden="true">
              <TreePine size={16} strokeWidth={2.4} />
            </div>
            <span>DSM</span>
          </div>

          <button
            type="button"
            className="dashboard-sidebar-close"
            aria-label="Fermer le menu"
            onClick={() => setIsSidebarOpen(false)}
          >
            <X size={16} />
          </button>
        </div>

        <div className="dashboard-sidebar-sections">
          {navigationSections.map((section) => (
            <div key={section.title} className="dashboard-sidebar-group">
              <p className="dashboard-sidebar-title">{section.title}</p>
              <nav className="dashboard-sidebar-nav" aria-label={section.title}>
                {section.items.map((item) => {
                  const Icon = item.icon;

                  return (
                    <NavLink
                      key={item.label}
                      to={item.to}
                      end={item.end}
                      className={({ isActive }) =>
                        isActive
                          ? "dashboard-sidebar-link dashboard-sidebar-link-active"
                          : "dashboard-sidebar-link"
                      }
                    >
                      <Icon size={15} strokeWidth={2} />
                      <span>{item.label}</span>
                    </NavLink>
                  );
                })}
              </nav>
            </div>
          ))}
        </div>

        <div className="dashboard-sidebar-footer">
          <div>
            <p className="dashboard-user-name">{user?.nom_complet || "Utilisateur"}</p>
            <p className="dashboard-user-role">{role || "Profil"}</p>
          </div>
          <button type="button" className="dashboard-logout" onClick={logout}>
            <LogOut size={15} />
          </button>
        </div>
      </aside>

      <div className="dashboard-body">
        <header className="dashboard-topbar">
          <button
            type="button"
            className="dashboard-menu-button"
            aria-label={isSidebarOpen ? "Fermer le menu" : "Ouvrir le menu"}
            aria-expanded={isSidebarOpen}
            onClick={() => setIsSidebarOpen((current) => !current)}
          >
            <Menu size={16} />
          </button>

          <div className="dashboard-topbar-user">
            <div className="dashboard-topbar-avatar">
              {(user?.nom_complet || "U").slice(0, 1).toUpperCase()}
            </div>
            <span>{user?.nom_complet || "Utilisateur"}</span>
            <ChevronDown size={14} strokeWidth={2.2} />
          </div>
        </header>

        <main className="dashboard-main">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default DashboardLayout;
