import { BriefcaseBusiness, Mail, ShieldCheck } from "lucide-react";
import { useMemo } from "react";
import { useAuth } from "../contexts/auth-context.js";

function getRoleLabel(role) {
  if (role === "administrateur") return "Administrateur";
  if (role === "agent terrain") return "Agent terrain";
  if (role === "commanditaire") return "Commanditaire";
  return "Non defini";
}

function getRoleClassName(role) {
  if (role === "administrateur") return "users-role-pill users-role-pill-admin";
  if (role === "agent terrain") return "users-role-pill users-role-pill-agent";
  if (role === "commanditaire") return "users-role-pill users-role-pill-sponsor";
  return "users-role-pill";
}

function getInitials(name) {
  return String(name || "U")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("");
}

function normalizeProjects(projects) {
  if (!Array.isArray(projects)) return [];

  return projects.map((project) => ({
    id: Number(project.id),
    name: project.nom || project.name || `Projet ${project.id}`,
    region: project.region || "Region non renseignee",
    description:
      project.description ||
      "Aucune description disponible pour ce projet.",
  }));
}

function AccountPage() {
  const { user, role } = useAuth();

  const name = user?.nom_complet || "Utilisateur";
  const email = user?.email || "Email non renseigne";
  const roleLabel = getRoleLabel(role);
  const projects = useMemo(() => normalizeProjects(user?.projects), [user?.projects]);

  return (
    <section className="users-page">
      <header className="account-header">
        <h1>Mon Compte</h1>
        <p>Consultez vos informations personnelles.</p>
      </header>

      <section className="account-card">
        <div className="account-card-heading">
          <h2>Informations personnelles</h2>
        </div>

        <div className="account-profile">
          <div className="account-avatar" aria-hidden="true">
            {getInitials(name)}
          </div>
          <div className="account-profile-meta">
            <p className="account-name">{name}</p>
            <span className={getRoleClassName(role)}>
              <ShieldCheck size={15} />
              {roleLabel}</span>
          </div>
        </div>

        <div className="account-stats-grid">
          <article className="account-stat-card">
            <p>
              <Mail size={15} strokeWidth={2} />
              <span>Adresse email</span>
            </p>
            <h3 title={email}>{email}</h3>
          </article>

          <article className="account-stat-card">
            <p>
              <ShieldCheck size={15} strokeWidth={2} />
              <span>Role</span>
            </p>
            <h3>{roleLabel}</h3>
          </article>

          <article className="account-stat-card account-stat-card-full">
            <p>
              <BriefcaseBusiness size={15} strokeWidth={2} />
              <span>Projets affectes</span>
            </p>
            <h3>{projects.length}</h3>
          </article>
        </div>
      </section>

      <section className="account-card">
        <div className="account-card-heading">
          <h2>Mes projets</h2>
        </div>

        {projects.length === 0 ? (
          <p className="muted-text">
            Aucun projet ne vous a ete affecte pour le moment.
          </p>
        ) : (
          <div className="account-project-grid">
            {projects.map((project) => (
              <article key={project.id} className="account-project-card">
                <div className="account-project-card-top">
                  <h3>{project.name}</h3>
                  <p>{project.region}</p>
                </div>
                <p className="account-project-description">{project.description}</p>
              </article>
            ))}
          </div>
        )}
      </section>
    </section>
  );
}

export default AccountPage;

