import { useEffect, useState } from "react";
import { useAuth } from "../contexts/auth-context.js";
import { getProjetParcelles } from "../api/parcelles.js";
import {
  getProjectMonitoring,
  getParcelleMonitoring,
} from "../api/monitoring.js";

function MonitoringPage() {
  const { selectedProjectId } = useAuth();
  const [parcelles, setParcelles] = useState([]);
  const [selectedParcelleId, setSelectedParcelleId] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [projectStats, setProjectStats] = useState(null);
  const [parcelleStats, setParcelleStats] = useState(null);

  useEffect(() => {
    let isMounted = true;

    async function fetchOptions() {
      if (!selectedProjectId) return;
      try {
        const { data } = await getProjetParcelles(selectedProjectId);
        if (isMounted) setParcelles(data.parcelles || []);
      } catch (err) {
        console.error(err);
      }
    }

    async function fetchProjectStats() {
      if (!selectedProjectId) return;
      try {
        const { data } = await getProjectMonitoring(selectedProjectId);
        if (isMounted) setProjectStats(data.stats_globales);
      } catch (err) {
        console.error(err);
      }
    }

    fetchOptions();
    fetchProjectStats();
    return () => { isMounted = false; };
  }, [selectedProjectId]);

  useEffect(() => {
    let isMounted = true;
    async function fetchParcelleStats() {
      if (!selectedParcelleId) {
        setParcelleStats(null);
        return;
      }
      setLoading(true);
      try {
        const { data } = await getParcelleMonitoring(selectedParcelleId);
        if (isMounted) setParcelleStats(data.stats);
      } catch {
        setErrorMessage("Erreur lors du chargement des stats de la parcelle.");
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    fetchParcelleStats();
    return () => { isMounted = false; };
  }, [selectedParcelleId]);

  return (
    <section className="panel panel-wide">
      <p className="eyebrow">Monitoring</p>
      <h2>Statistiques de suivi</h2>

      <div className="filters-bar">
        <label className="filter-field">
          <span>Parcelle</span>
          <select
            value={selectedParcelleId}
            onChange={(event) => setSelectedParcelleId(event.target.value)}
          >
            <option value="">Stats globales du projet</option>
            {parcelles.map((parcelle) => (
              <option key={parcelle.id} value={parcelle.id}>
                {parcelle.nom || `Parcelle ${parcelle.id}`}
              </option>
            ))}
          </select>
        </label>
      </div>

      {errorMessage ? <p className="form-error">{errorMessage}</p> : null}

      {!selectedParcelleId && projectStats && (
        <div className="stats-section">
          <h3>Resultats globaux du projet</h3>
          <div className="dashboard-grid">
            <article className="metric-card">
              <p className="eyebrow">Total Plants</p>
              <h3>{projectStats.total_plants}</h3>
            </article>
            <article className="metric-card">
              <p className="eyebrow">Vivants</p>
              <h3>{projectStats.vivants}</h3>
            </article>
            <article className="metric-card">
              <p className="eyebrow">Morts</p>
              <h3>{projectStats.morts}</h3>
            </article>
            <article className="metric-card">
              <p className="eyebrow">Taux de survie</p>
              <h3>{projectStats.taux_survie}%</h3>
            </article>
          </div>
        </div>
      )}

      {selectedParcelleId && parcelleStats && (
        <div className="stats-section">
          <h3>Resultats pour la parcelle selectionnee</h3>
          <div className="dashboard-grid">
            <article className="metric-card">
              <p className="eyebrow">Total Plants</p>
              <h3>{parcelleStats.total_plants}</h3>
            </article>
            <article className="metric-card">
              <p className="eyebrow">Vivants</p>
              <h3>{parcelleStats.vivants}</h3>
            </article>
            <article className="metric-card">
              <p className="eyebrow">Morts</p>
              <h3>{parcelleStats.morts}</h3>
            </article>
            <article className="metric-card">
              <p className="eyebrow">Taux de survie</p>
              <h3>{parcelleStats.taux_survie}%</h3>
            </article>
          </div>
        </div>
      )}

      {loading && selectedParcelleId && !errorMessage ? (
        <p className="muted-text">Chargement des statistiques...</p>
      ) : null}
    </section>
  );
}

export default MonitoringPage;
