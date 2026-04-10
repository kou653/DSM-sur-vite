import { Leaf, MapPinned, Plus, Sprout, Trash2, Trees, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import HeroCard from "../components/HeroCard.jsx";
import { useAuth } from "../contexts/auth-context.js";
import { getProjectMonitoring } from "../api/monitoring.js";
import { createProjet, deleteProjet, getProjets } from "../api/projets.js";

function normalizeProjects(payload) {
  const rawProjects = Array.isArray(payload)
    ? payload
    : payload?.projets || payload?.data || [];

  return rawProjects.map((project) => ({
    id: Number(project.id),
    code: `PRJ${project.id}`,
    name: project.nom || `Projet ${project.id}`,
    description: project.description || null,
    objectif: project.objectif ?? null,
    status: project.status || null,
    region: project.region || null,
    parcellesCount: Number(project.parcelles_count || 0),
    totalPlants: 0,
    survivalRate: null,
    raw: project,
  }));
}

function buildInitialFormState() {
  return {
    nom: "",
    description: "",
    date_debut: "",
    date_fin: "",
    region: "",
    objectif: "",
    status: "actif",
  };
}

function ProjectListPage() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [metrics, setMetrics] = useState({
    totalPlants: 0,
    averageSurvivalRate: 0,
  });
  const [errorMessage, setErrorMessage] = useState("");
  const [actionError, setActionError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isCreateFormOpen, setIsCreateFormOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formState, setFormState] = useState(buildInitialFormState());
  const { role, accessibleProjectIds, selectedProjectId, setSelectedProjectId } =
    useAuth();

  const fetchProjects = useCallback(async () => {
    setLoadingProjects(true);
    setErrorMessage("");

    try {
      const { data } = await getProjets();
      const normalizedProjects = normalizeProjects(data);

      const monitorableProjects = normalizedProjects.filter(
        (project) =>
          role === "administrateur" || accessibleProjectIds.includes(project.id)
      );

      if (monitorableProjects.length === 0) {
        setProjects(normalizedProjects);
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

      const survivalRateByProjectId = new Map(
        monitorableProjects.map((project, index) => [
          project.id,
          Number(
            monitoringResponses[index]?.data?.stats_globales?.taux_survie ?? 0
          ),
        ])
      );
      const totalPlantsByProjectId = new Map(
        monitorableProjects.map((project, index) => [
          project.id,
          Number(
            monitoringResponses[index]?.data?.stats_globales?.total_plants ?? 0
          ),
        ])
      );

      setProjects(
        normalizedProjects.map((project) => ({
          ...project,
          totalPlants: totalPlantsByProjectId.get(project.id) ?? 0,
          survivalRate: survivalRateByProjectId.get(project.id) ?? null,
        }))
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
    fetchProjects().catch(() => { });
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

  function openCreateForm() {
    setActionError("");
    setSuccessMessage("");
    setFormState(buildInitialFormState());
    setIsCreateFormOpen(true);
  }

  function closeCreateForm() {
    setActionError("");
    setFormState(buildInitialFormState());
    setIsCreateFormOpen(false);
  }

  function handleInputChange(event) {
    const { name, value } = event.target;
    setFormState((current) => ({
      ...current,
      [name]: value,
    }));
  }

  async function handleCreateProject(event) {
    event.preventDefault();
    setSubmitting(true);
    setActionError("");
    setSuccessMessage("");

    const payload = {
      nom: formState.nom.trim(),
      description: formState.description.trim(),
      date_debut: formState.date_debut,
      date_fin: formState.date_fin,
      region: formState.region.trim(),
      status: formState.status,
    };

    if (formState.objectif !== "") {
      payload.objectif = Number(formState.objectif);
    }

    try {
      await createProjet(payload);
      await fetchProjects();
      closeCreateForm();
      setSuccessMessage("Projet cree avec succes.");
    } catch (error) {
      setActionError(
        error.response?.data?.message || "Impossible de creer ce projet."
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeleteProject(project) {
    const confirmed = window.confirm(
      `Voulez-vous vraiment supprimer le projet ${project.name} ?`
    );

    if (!confirmed) {
      return;
    }

    setSubmitting(true);
    setActionError("");
    setSuccessMessage("");

    try {
      await deleteProjet(project.id);
      await fetchProjects();
      setSuccessMessage("Projet supprime avec succes.");
    } catch (error) {
      setActionError(
        error.response?.data?.message || "Impossible de supprimer ce projet."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="dashboard-overview">
      <div className="dashboard-overview-header">
        <div className="dashboard-overview-title">
          <h1>Vue d'ensemble</h1>
          <p>Vue d&apos;ensemble de tous les projets</p>
        </div>

        {role === "administrateur" ? (
          <button
            type="button"
            className="dashboard-add-button"
            onClick={openCreateForm}
          >
            <Plus size={14} strokeWidth={2.4} />
            Ajouter un projet
          </button>
        ) : null}
      </div>

      {errorMessage ? <p className="form-error">{errorMessage}</p> : null}
      {actionError ? <p className="form-error">{actionError}</p> : null}
      {successMessage ? <p className="evolution-success">{successMessage}</p> : null}

      {isCreateFormOpen ? (
        <section className="users-form-panel project-create-panel">
          <div className="users-form-header">
            <div>
              <p className="eyebrow">Creation</p>
              <h2>Creer un nouveau projet</h2>
            </div>

            <button
              type="button"
              className="secondary-action"
              onClick={closeCreateForm}
            >
              <X size={16} strokeWidth={2} />
              Fermer
            </button>
          </div>

          <form className="users-form" onSubmit={handleCreateProject}>
            <div className="project-create-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1rem" }}>
              <label className="filter-field">
                <span>Nom du projet</span>
                <input
                  type="text"
                  name="nom"
                  value={formState.nom}
                  onChange={handleInputChange}
                  required
                />
              </label>

              <label className="filter-field">
                <span>Region</span>
                <input
                  type="text"
                  name="region"
                  value={formState.region}
                  onChange={handleInputChange}
                  required
                />
              </label>
            </div>

            <label className="filter-field">
              <span>Description</span>
              <textarea
                name="description"
                value={formState.description}
                onChange={handleInputChange}
                rows={4}
                required
              />
            </label>

            <div className="project-create-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1rem" }}>
              <label className="filter-field">
                <span>Date de debut</span>
                <input
                  type="date"
                  name="date_debut"
                  value={formState.date_debut}
                  onChange={handleInputChange}
                  required
                />
              </label>

              <label className="filter-field">
                <span>Date de fin</span>
                <input
                  type="date"
                  name="date_fin"
                  value={formState.date_fin}
                  onChange={handleInputChange}
                  required
                />
              </label>
            </div>

            <div className="project-create-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1rem" }}>
              <label className="filter-field">
                <span>Objectif global</span>
                <input
                  type="number"
                  min="1"
                  name="objectif"
                  value={formState.objectif}
                  onChange={handleInputChange}
                  placeholder="Optionnel"
                />
              </label>

              <label className="filter-field">
                <span>Statut</span>
                <select
                  name="status"
                  value={formState.status}
                  onChange={handleInputChange}
                >
                  <option value="actif">Actif</option>
                  <option value="en_pause">En pause</option>
                  <option value="termine">Termine</option>
                </select>
              </label>
            </div>

            <div className="crud-actions">
              <button type="submit" className="primary-action" disabled={submitting}>
                {submitting ? "Creation..." : "Creer le projet"}
              </button>
              <button
                type="button"
                className="secondary-action"
                onClick={closeCreateForm}
              >
                Annuler
              </button>
            </div>
          </form>
        </section>
      ) : null}

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

            return (
              <article
                key={project.id}
                className={canOpen ? "dashboard-project-card hover-card-effect project-card-clickable" : "dashboard-project-card"}
                onClick={() => {
                  if (!canOpen) {
                    return;
                  }

                  setSelectedProjectId(project.id);
                  navigate(`/dashboard/projet/${project.id}`);
                }}
              >
                <div className="dashboard-project-card-top">
                  <div className="dashboard-project-heading">
                    <h3>{project.name}</h3>
                    <p>{project.region || "Region non renseignee"}</p>
                  </div>
                  {role === "administrateur" ? (
                    <button
                      type="button"
                      className="project-card-delete-button"
                      onClick={(event) => {
                        event.stopPropagation();
                        handleDeleteProject(project);
                      }}
                      disabled={submitting}
                      title="Supprimer le projet"
                    >
                      <Trash2 size={14} strokeWidth={2} />
                    </button>
                  ) : null}
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
                    <strong>{project.totalPlants}</strong>
                    <span>Plants</span>
                  </div>
                  <div>
                    <strong>
                      {project.survivalRate !== null
                        ? `${project.survivalRate.toFixed(1)}%`
                        : "-"}
                    </strong>
                    <span>Taux de survie</span>
                  </div>
                </div>
                {!canOpen ? (
                  <span className="project-disabled-link">Acces non autorise</span>
                ) : null}
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
    </section>
  );
}

export default ProjectListPage;
