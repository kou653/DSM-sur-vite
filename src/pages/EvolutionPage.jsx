import { Activity, ArrowRight, Camera, Images, MapPinned } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getProjetParcelles } from "../api/parcelles.js";
import { useAuth } from "../contexts/auth-context.js";

function EvolutionPage() {
  const { selectedProjectId } = useAuth();
  const [parcelles, setParcelles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const fetchParcelles = useCallback(async () => {
    if (!selectedProjectId) {
      setParcelles([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setErrorMessage("");

    try {
      const response = await getProjetParcelles(selectedProjectId);
      const rawParcelles = Array.isArray(response.data) ? response.data : response.data?.parcelles || response.data?.data || [];
      setParcelles(rawParcelles);
    } catch {
      setErrorMessage("Impossible de charger les parcelles du projet.");
    } finally {
      setLoading(false);
    }
  }, [selectedProjectId]);

  useEffect(() => {
    fetchParcelles();
  }, [fetchParcelles]);

  return (
    <section className="users-page">
      <div className="users-toolbar">
        <div className="users-hero" style={{ margin: 0 }}>
          <div className="users-hero-icon" aria-hidden="true">
            <Camera size={22} strokeWidth={2.1} />
          </div>
          <div>
            <h1>Suivi Visuel par Parcelle</h1>
            <p>Sélectionnez une parcelle pour voir son évolution historique.</p>
          </div>
        </div>
      </div>

      {errorMessage ? <p className="form-error">{errorMessage}</p> : null}

      {loading ? (
        <p className="muted-text" style={{ marginTop: "2rem" }}>Chargement des parcelles...</p>
      ) : null}

      {!loading && parcelles.length === 0 && !errorMessage ? (
        <div style={{ textAlign: "center", padding: "4rem 2rem", background: "var(--surface)", borderRadius: "var(--radius-lg)", border: "1px dashed var(--border)" }}>
          <Images size={48} style={{ color: "var(--border)", marginBottom: "1rem" }} />
          <h3 style={{ margin: "0 0 0.5rem 0" }}>Aucune parcelle</h3>
          <p className="muted-text" style={{ margin: 0 }}>Créez d'abord une parcelle dans l'onglet correspondant.</p>
        </div>
      ) : null}

      {!loading && parcelles.length > 0 ? (
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: "1.5rem",
          marginTop: "2rem"
        }}>
          {parcelles.map((parcelle) => (
            <Link
              key={parcelle.id}
              to={String(parcelle.id)}
              style={{
                display: "flex",
                flexDirection: "column",
                background: "#ffffff",
                borderRadius: "var(--radius-md)",
                textDecoration: "none",
                color: "inherit",
                overflow: "hidden",
                textAlign: "center"
              }}
              className="hover-card-effect"
            >
              <div style={{ padding: "2rem 1.5rem", flexGrow: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "0.5rem" }}>
                <h3 style={{ margin: 0, fontSize: "1.3rem", color: "var(--text)", fontWeight: "700" }}>
                  {parcelle.nom || `Parcelle #${parcelle.id}`}
                </h3>
                <span style={{ color: "var(--primary)", fontSize: "1rem", fontWeight: "600" }}>
                  {Number(parcelle.superficie || 0)} ha
                </span>
              </div>

              <div style={{
                background: "var(--surface-hover)",
                padding: "1rem 1.5rem",
                borderTop: "1px solid var(--border-soft)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--primary)",
                fontWeight: "600",
                fontSize: "0.95rem"
              }}>
                <span>Voir les photos</span>
              </div>
            </Link>
          ))}
        </div>
      ) : null}
    </section>
  );
}

export default EvolutionPage;
