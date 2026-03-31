import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
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
    code: project.code || `PRJ${project.id}`,
    name: project.nom || project.name || `Projet ${project.id}`,
    description: project.description || null,
    status: project.status || null,
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

  return (
    <section className="project-list-page">
      <div className="page-intro">
        <div>
          <p className="eyebrow">Projets</p>
          <h2>Liste des projets</h2>
        </div>

        {role === "admin" ? (
          <button type="button" className="primary-action">
            Ajouter un projet
          </button>
        ) : null}
      </div>

      {errorMessage ? <p className="form-error">{errorMessage}</p> : null}

      {loadingProjects ? (
        <section className="panel panel-inline">
          <p>Chargement des projets...</p>
        </section>
      ) : null}

      <div className="project-grid">
        {projects.map((project) => {
          const canOpen = role === "admin" || accessibleProjectIds.includes(project.id);
          const isSelected = selectedProjectId === project.id;

          return (
            <article key={project.id} className="project-card">
              <p className="eyebrow">Projet</p>
              <p className="project-code">{project.code}</p>
              <h3>{project.name}</h3>
              <p>
                {project.partnerName
                  ? `Commanditaire : ${project.partnerName}`
                  : "Commanditaire non renseigne"}
              </p>
              <p>
                {project.status
                  ? `Statut : ${project.status}`
                  : canOpen
                    ? "Projet accessible avec votre profil actuel."
                    : "Projet visible, mais non accessible avec votre profil actuel."}
              </p>
              {canOpen ? (
                <Link
                  className="text-link"
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
          <p>Aucun projet n'a ete retourne par l'API.</p>
        </section>
      ) : null}

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
          status: "actif",
        }}
        canManage={role === "admin" || role === "administrateur"}
        getRecordLabel={(record) => record.name}
      />
    </section>
  );
}

export default ProjectListPage;
