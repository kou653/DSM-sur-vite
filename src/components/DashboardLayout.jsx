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
  User,
  X,
} from "lucide-react";
import { Download } from "lucide-react";
import { useRef, useState, useEffect } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/auth-context.js";

function DashboardLayout() {
  const { role, selectedProjectId, user, logout } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  // Fermer le menu si on clique ailleurs
  useEffect(() => {
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setDeferredPrompt(null);
    }
  };

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
          to: `${projectBasePath}/carte`,
          label: "Carte",
          icon: Map,
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
              to: (isProjectRoute && projectBasePath) ? `${projectBasePath}/utilisateurs` : "/dashboard/utilisateurs",
              label: "Utilisateurs",
              icon: Users,
            },
            ...(isProjectRoute && projectBasePath
              ? [
                {
                  to: `${projectBasePath}/especes`,
                  label: "Especes",
                  icon: TreePine,
                },
              ]
              : []),
          ],
        },
      ]
      : []),
    {
      title: "Compte",
      items: [
        {
          to: "/dashboard/compte",
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
          {/* <button type="button" className="dashboard-logout" onClick={logout}>
            <LogOut size={15} />
          </button> */}
        </div>
      </aside>

      {isSidebarOpen ? (
        <button
          type="button"
          className="dashboard-sidebar-backdrop"
          aria-label="Fermer le menu"
          onClick={() => setIsSidebarOpen(false)}
        />
      ) : null}

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

          <div className="dashboard-topbar-user" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <button
              onClick={() => {
                if (deferredPrompt) {
                  handleInstallClick();
                } else {
                  alert("L'installation PWA n'est pas encore disponible. Le navigateur n'a pas déclenché l'événement (peut-être l'app est-elle déjà installée, ou le cache doit être vidé).");
                }
              }}
              className="dashboard-add-button"
              style={{
                padding: '4px 10px',
                fontSize: '0.85rem',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                opacity: deferredPrompt ? 1 : 0.6
              }}
              title="Installer l'application sur votre appareil"
            >
              <Download size={14} /> Installer
            </button>

            <div style={{ position: "relative" }} ref={menuRef}>
              <div
                style={{ display: "flex", alignItems: "center", gap: "7px", cursor: "pointer" }}
                onClick={() => setMenuOpen(prev => !prev)}
              >
                <div className="dashboard-topbar-avatar">
                  {(user?.nom_complet || "U").slice(0, 1).toUpperCase()}
                </div>
                <span>{user?.nom_complet || "Utilisateur"}</span>
                <ChevronDown size={14} strokeWidth={2.2} />
              </div>

              {menuOpen && (
                <div style={{
                  position: "absolute",
                  top: "calc(100% + 8px)",
                  right: 0,
                  background: "#ffffff",
                  border: "1px solid #b9e7cb",
                  borderRadius: "12px",
                  boxShadow: "0 8px 24px rgba(20,150,85,0.1)",
                  minWidth: "200px",
                  zIndex: 100,
                  overflow: "hidden"
                }}>

                  {/* Nom et email */}
                  <div style={{ padding: "12px 16px" }}>
                    <p style={{ margin: 0, fontWeight: "600", fontSize: "0.95rem", color: "#0f1c10" }}>
                      {user?.nom_complet || "Utilisateur"}
                    </p>
                    <p style={{ margin: "2px 0 0", fontSize: "0.82rem", color: "#7d8d80" }}>
                      {user?.email || ""}
                    </p>
                  </div>

                  <div style={{ height: "1px", background: "#b9e7cb" }} />

                  <Link
                    to="/dashboard/compte"
                    onClick={() => setMenuOpen(false)}
                    style={{
                      display: "flex", alignItems: "center", gap: "8px",
                      padding: "11px 16px", color: "#0f1c10",
                      textDecoration: "none", fontSize: "0.92rem"
                    }}
                  >
                    <User size={15} /> Mon compte
                  </Link>

                  <div style={{ height: "1px", background: "#b9e7cb" }} />

                  <button
                    type="button"
                    className="dashboard-logout"
                    onClick={() => { logout(); setMenuOpen(false); }}
                    style={{
                      display: "flex", alignItems: "center", gap: "8px",
                      width: "100%", padding: "14px 16px",
                      fontSize: "0.92rem", border: "none",
                      background: "none", cursor: "pointer", color: "#ff0000ff"
                    }}
                  >
                    <LogOut size={15} /> Se déconnecter
                  </button>
                </div>
              )}
            </div>
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
