import {
  Building2,
  ChevronDown,
  LayoutDashboard,
  LogOut,
  Menu,
  TreePine,
  UserCircle2,
  Users,
} from "lucide-react";
import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../contexts/auth-context.js";

function DashboardLayout() {
  const { role, selectedProjectId, user, logout } = useAuth();

  const adminBasePath = selectedProjectId
    ? `/dashboard/projet/${selectedProjectId}`
    : "/dashboard";

  const navigationSections = [
    {
      title: "Principal",
      items: [
        {
          to: "/dashboard",
          label: "Tableau de bord",
          icon: LayoutDashboard,
        },
      ],
    },
    ...(role === "administrateur"
      ? [
          {
            title: "Administration",
            items: [
              {
                to: `${adminBasePath}/cooperatives`,
                label: "Cooperatives",
                icon: Building2,
              },
              {
                to: `${adminBasePath}/utilisateurs`,
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
    <div className="dashboard-shell">
      <aside className="dashboard-sidebar">
        <div className="dashboard-brand">
          <div className="dashboard-brand-mark" aria-hidden="true">
            <TreePine size={16} strokeWidth={2.4} />
          </div>
          <span>DSM</span>
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
                      end={item.to === "/dashboard"}
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
          <button type="button" className="dashboard-menu-button" aria-label="Menu">
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
