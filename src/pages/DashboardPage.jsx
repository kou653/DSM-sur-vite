import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getProjet } from "../api/projets.js";
import { getProjectMonitoring } from "../api/monitoring.js";

function DashboardPage() {
  const { projectId } = useParams();
  const [projet, setProjet] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function fetchDashboardData() {
      setLoading(true);
      setErrorMessage("");

      try {
        const [projetRes, monitoringRes] = await Promise.all([
          getProjet(projectId),
          getProjectMonitoring(projectId),
        ]);

        if (!isMounted) return;

        setProjet(projetRes.data.projet);
        setStats(monitoringRes.data.stats_globales);
      } catch (error) {
        if (!isMounted) return;
        setErrorMessage(
          error.response?.data?.message || "Impossible de charger les données."
        );
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    fetchDashboardData();
    return () => {
      isMounted = false;
    };
  }, [projectId]);

  if (loading) {
    return (
      <section className="panel panel-inline">
        <p>Chargement du tableau de bord...</p>
      </section>
    );
  }

  if (errorMessage) {
    return (
      <section className="panel panel-inline">
        <p className="form-error">{errorMessage}</p>
      </section>
    );
  }

  const metrics = stats ? [
    ["Total Plants", stats.total_plants],
    ["Vivants", stats.vivants],
    ["Morts", stats.morts],
    ["Taux de survie", `${stats.taux_survie}%`],
  ] : [];

  const projectName = projet?.nom || `Projet ${projectId}`;

  return (
    <section className="panel panel-wide">
      <p className="eyebrow">Tableau de bord</p>
      <h2>{projectName}</h2>
      <p>{projet?.description || "Pas de description disponible."}</p>

      <div className="dashboard-grid">
        {metrics.map(([label, value]) => (
          <article key={label} className="metric-card">
            <p className="eyebrow">{label}</p>
            <h3>{String(value ?? "-")}</h3>
          </article>
        ))}
      </div>

      <div className="info-section">
        <h3>Informations generales</h3>
        <p>Region : {projet?.region || "N/A"}</p>
        <p>Debut : {projet?.date_debut || "N/A"}</p>
        <p>Fin : {projet?.date_fin || "N/A"}</p>
        <p>Statut : {projet?.status || "N/A"}</p>
      </div>
    </section>
  );
}

export default DashboardPage;
