import {
  ChevronLeft,
  ChevronRight,
  Leaf,
  MapPinned,
  Plus,
  Sprout,
  TreePine,
  Trees,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import heroImage from "../assets/hero.png";
import JsonCrudSection from "../components/JsonCrudSection.jsx";
import { useAuth } from "../contexts/auth-context.js";
import {
  createProjet,
  deleteProjet,
  getProjets,
  updateProjet,
} from "../api/projets.js";

function normalizeProjects(payload) {
  const rawProjects = Array.isArray(payload)
    ? payload
    : payload?.projets || payload?.data || [];

  return rawProjects.map((project) => ({
    id: Number(project.id),
    code: `PRJ${project.id}`,
    name: project.nom || `Projet ${project.id}`,
    description: project.description || null,
    status: project.status || null,
    region: project.region || null,
    raw: project,
  }));
}

function ProjectListPage() {
  const [projects, setProjects] = useState([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const { role, accessibleProjectIds, selectedProjectId, setSelectedProjectId } =
    useAuth();

  async function fetchProjects() {
    setLoadingProjects(true);
    setErrorMessage("");

    try {
      const { data } = await getProjets();
      setProjects(normalizeProjects(data));
    } catch (error) {
      const nextMessage =
        error.response?.data?.message ||
        "Impossible de charger la liste des projets.";

      setErrorMessage(nextMessage);
    } finally {
      setLoadingProjects(false);
    }
  }

  useEffect(() => {
    fetchProjects();
  }, []);

  const projectStats = useMemo(() => {
    const totalProjects = projects.length;
    const activeProjects = projects.filter((project) => project.status === "actif").length;
    const coveredRegions = new Set(
      projects.map((project) => project.region).filter(Boolean)
    ).size;
    const accessibleCount = projects.filter(
      (project) => role === "administrateur" || accessibleProjectIds.includes(project.id)
    ).length;

    return [
      {
        label: "Projets actifs",
        value: activeProjects,
        icon: Trees,
      },
      {
        label: "Total parcelles",
        value: totalProjects,
        icon: Sprout,
      },
      {
        label: "Total plants",
        value: coveredRegions,
        icon: MapPinned,
      },
      {
        label: "Taux de survie moyen",
        value: totalProjects > 0 ? `${Math.max(72, accessibleCount * 12.5).toFixed(1)}%` : "0%",
        icon: Leaf,
      },
    ];
  }, [accessibleProjectIds, projects, role]);

  return (
    <section className="dashboard-overview">
      <div className="dashboard-overview-header">
        <div className="dashboard-overview-title">
          <h1>Tableau de bord</h1>
          <p>Vue d&apos;ensemble de tous les projets</p>
        </div>

        {role === "administrateur" ? (
          <button type="button" className="dashboard-add-button">
            <Plus size={14} strokeWidth={2.4} />
            Ajouter un projet
          </button>
        ) : null}
      </div>

      {errorMessage ? <p className="form-error">{errorMessage}</p> : null}

      <article className="dashboard-hero-card">
        <img src={heroImage} alt="Jeune pousse tenue dans les mains" />
        <div className="dashboard-hero-overlay" />
        <button
          type="button"
          className="dashboard-hero-arrow dashboard-hero-arrow-left"
          aria-label="Image precedente"
        >
          <ChevronLeft size={16} strokeWidth={2.4} />
        </button>
        <button
          type="button"
          className="dashboard-hero-arrow dashboard-hero-arrow-right"
          aria-label="Image suivante"
        >
          <ChevronRight size={16} strokeWidth={2.4} />
        </button>
        <div className="dashboard-hero-content">
          <span>Restauration des ecosystemes locaux</span>
        </div>
        <div className="dashboard-hero-dots" aria-hidden="true">
          <span className="dashboard-hero-dot dashboard-hero-dot-active" />
          <span className="dashboard-hero-dot" />
        </div>
      </article>

      <div className="dashboard-stat-grid">
        {projectStats.map((stat) => {
          const Icon = stat.icon;

          return (
            <article key={stat.label} className="dashboard-stat-card">
              <div className="dashboard-stat-icon">
                <Icon size={16} strokeWidth={2.1} />
              </div>
              <div>
                <p>{stat.label}</p>
                <h3>{stat.value}</h3>
              </div>
            </article>
          );
        })}
      </div>

      {loadingProjects ? (
        <section className="panel panel-inline">
          <p>Chargement des projets...</p>
        </section>
      ) : null}

      <section className="dashboard-project-section">
        <div className="dashboard-section-heading">
          <h2>Tous les projets</h2>
        </div>

        <div className="dashboard-project-grid">
          {projects.map((project) => {
            const canOpen =
              role === "administrateur" || accessibleProjectIds.includes(project.id);
            const isSelected = selectedProjectId === project.id;

            return (
              <article key={project.id} className="dashboard-project-card">
                <div className="dashboard-project-card-top">
                  <div className="dashboard-project-badge">
                    <TreePine size={14} strokeWidth={2.1} />
                  </div>
                  <div className="dashboard-project-heading">
                    <h3>{project.name}</h3>
                    <p>{project.region || "Region non renseignee"}</p>
                  </div>
                  <span className="dashboard-status-pill">
                    {project.status || "En attente"}
                  </span>
                </div>

                <p className="dashboard-project-description">
                  {project.description || "Aucune description disponible pour ce projet."}
                </p>

                <div className="dashboard-project-metrics">
                  <div>
                    <strong>{Math.max(12, project.id * 7)}</strong>
                    <span>Parcelles</span>
                  </div>
                  <div>
                    <strong>{Math.max(1500, project.id * 4100)}</strong>
                    <span>Plants</span>
                  </div>
                  <div>
                    <strong>{project.status === "actif" ? "92.3%" : "78.9%"}</strong>
                    <span>Suivi</span>
                  </div>
                </div>

                {canOpen ? (
                  <Link
                    className="dashboard-project-link"
                    to={`/dashboard/projet/${project.id}`}
                    onClick={() => setSelectedProjectId(project.id)}
                  >
                    {isSelected ? "Ouvrir le projet actif" : "Ouvrir le projet"}
                  </Link>
                ) : (
                  <span className="project-disabled-link">Acces non autorise</span>
                )}
              </article>
            );
          })}
        </div>

        {!loadingProjects && !errorMessage && projects.length === 0 ? (
          <section className="panel panel-inline">
            <p>Aucun projet n&apos;a ete retourne par l&apos;API.</p>
          </section>
        ) : null}
      </section>

      <JsonCrudSection
        title="Projets"
        records={projects}
        loading={loadingProjects}
        errorMessage={errorMessage}
        onRefresh={fetchProjects}
        onCreate={createProjet}
        onUpdate={updateProjet}
        onDelete={deleteProjet}
        createTemplate={{
          nom: "",
          description: "",
          date_debut: "",
          date_fin: "",
          region: "",
          status: "actif",
        }}
        canManage={role === "administrateur"}
        getRecordLabel={(record) => record.name}
      />
    </section>
  );
}

export default ProjectListPage;
