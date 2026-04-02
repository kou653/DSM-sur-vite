import { Leaf, MapPinned, Plus, Sprout, Trees } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import JsonCrudSection from "../components/JsonCrudSection.jsx";
import HeroCard from "../components/HeroCard.jsx";
import { useAuth } from "../contexts/auth-context.js";
import { getProjectMonitoring } from "../api/monitoring.js";
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
    parcellesCount: Number(project.parcelles_count || 0),
    raw: project,
  }));
}

function ProjectListPage() {
  const [projects, setProjects] = useState([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [metrics, setMetrics] = useState({
    totalPlants: 0,
    averageSurvivalRate: 0,
  });
  const [errorMessage, setErrorMessage] = useState("");
  const { role, accessibleProjectIds, selectedProjectId, setSelectedProjectId } =
    useAuth();

  const fetchProjects = useCallback(async () => {
    setLoadingProjects(true);
    setErrorMessage("");

    try {
      const { data } = await getProjets();
      const normalizedProjects = normalizeProjects(data);

      setProjects(normalizedProjects);

      const monitorableProjects = normalizedProjects.filter(
        (project) =>
          role === "administrateur" || accessibleProjectIds.includes(project.id)
      );

      if (monitorableProjects.length === 0) {
        setMetrics({
          totalPlants: 0,
          averageSurvivalRate: 0,
        });
        return;
      }

      const monitoringResponses = await Promise.all(
        monitorableProjects.map((project) =>
          getProjectMonitoring(project.id).catch(() => null)
        )
      );

      const validStats = monitoringResponses
        .map((response) => response?.data?.stats_globales)
        .filter(Boolean);

      const totalPlants = validStats.reduce(
        (sum, stat) => sum + Number(stat.total_plants || 0),
        0
      );
      const averageSurvivalRate =
        validStats.length > 0
          ? validStats.reduce(
              (sum, stat) => sum + Number(stat.taux_survie || 0),
              0
            ) / validStats.length
          : 0;

      setMetrics({
        totalPlants,
        averageSurvivalRate,
      });
    } catch (error) {
      const nextMessage =
        error.response?.data?.message ||
        "Impossible de charger la liste des projets.";

      setErrorMessage(nextMessage);
      throw error;
    } finally {
      setLoadingProjects(false);
    }
  }, [accessibleProjectIds, role]);

  useEffect(() => {
    fetchProjects().catch(() => {});
  }, [fetchProjects]);

  const projectStats = useMemo(() => {
    const activeProjects = projects.filter((project) => project.status === "actif").length;
    const totalParcelles = projects.reduce(
      (sum, project) => sum + project.parcellesCount,
      0
    );

    return [
      {
        label: "Projets actifs",
        value: activeProjects,
        icon: Trees,
      },
      {
        label: "Total parcelles",
        value: totalParcelles,
        icon: Sprout,
      },
      {
        label: "Total plants",
        value: metrics.totalPlants,
        icon: MapPinned,
      },
      {
        label: "Taux de survie moyen",
        value: `${metrics.averageSurvivalRate.toFixed(1)}%`,
        icon: Leaf,
      },
    ];
  }, [metrics.averageSurvivalRate, metrics.totalPlants, projects]);

  return (
    <section className="dashboard-overview">
      <div className="dashboard-overview-header">
        <div className="dashboard-overview-title">
          <h1>Vue d'ensemble</h1>
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

      <HeroCard />

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
                    <Trees size={13} strokeWidth={2.1} />
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
                    <strong>{project.parcellesCount}</strong>
                    <span>Parcelles</span>
                  </div>
                  <div>
                    <strong>{project.code}</strong>
                    <span>Code projet</span>
                  </div>
                  <div>
                    <strong>{project.status || "-"}</strong>
                    <span>Statut</span>
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
