import { Activity, ArrowLeft, Building2, CheckCircle2, ChevronRight, Crosshair, FileText, MapPinned, Plus, Target, X, ZoomIn } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getParcelle } from "../api/parcelles.js";
import { createPlant, getParcellePlants, updatePlantDocumentation, updatePlantStatus } from "../api/plants.js";
import { getEspeces } from "../api/referentiels.js";
import { useAuth } from "../contexts/auth-context.js";

function ParcelleDetailsPage() {
  const { role, selectedProjectId } = useAuth();
  const { parcelleId } = useParams();

  // Core parcelle info
  const [parcelle, setParcelle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  // Plants
  const [plants, setPlants] = useState([]);
  const [loadingPlants, setLoadingPlants] = useState(true);

  // Plant documentation
  const [isDocumentationFormOpen, setIsDocumentationFormOpen] = useState(false);
  const [documentationPlant, setDocumentationPlant] = useState(null);
  const [documentationText, setDocumentationText] = useState("");
  const [documentationSubmitting, setDocumentationSubmitting] = useState(false);
  const [documentationError, setDocumentationError] = useState("");
  const [documentationSuccess, setDocumentationSuccess] = useState("");

  // Reference data
  const [especes, setEspeces] = useState([]);

  // Plants Form
  const [isPlantFormOpen, setIsPlantFormOpen] = useState(false);
  const [plantSubmitting, setPlantSubmitting] = useState(false);
  const [plantFormError, setPlantFormError] = useState("");

  // Plant Autocomplete
  const [especeSearch, setEspeceSearch] = useState("");
  const [showEspeceDropdown, setShowEspeceDropdown] = useState(false);

  const [plantFormState, setPlantFormState] = useState({
    espece_id: "",
    date_plantation: new Date().toISOString().slice(0, 10),
    status: "vivant",
    lat: "",
    lng: ""
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    setErrorMessage("");

    try {
      const [parcelleRes, especesRes, plantsRes] = await Promise.all([
        getParcelle(parcelleId),
        getEspeces(),
        getParcellePlants(parcelleId).catch(() => ({ data: [] }))
      ]);

      const parcelleData = parcelleRes.data.parcelle || parcelleRes.data;
      setParcelle(parcelleData);

      const rawEspeces = Array.isArray(especesRes.data)
        ? especesRes.data
        : especesRes.data?.especes || especesRes.data?.data || [];
      setEspeces(rawEspeces);

      const rawPlants = Array.isArray(plantsRes.data)
        ? plantsRes.data
        : plantsRes.data?.plants || plantsRes.data?.data || [];
      setPlants(rawPlants);

      // Inherit coordinates if not manually filled yet in form
      setPlantFormState(prev => ({
        ...prev,
        lat: prev.lat || parcelleData.lat || "",
        lng: prev.lng || parcelleData.lng || ""
      }));

    } catch (error) {
      setErrorMessage("Impossible de charger les sous-données de la parcelle.");
    } finally {
      setLoading(false);
      setLoadingPlants(false);
    }
  }, [parcelleId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const refreshPlants = async () => {
    try {
      const plantsRes = await getParcellePlants(parcelleId);
      const rawPlants = Array.isArray(plantsRes.data)
        ? plantsRes.data
        : plantsRes.data?.plants || plantsRes.data?.data || [];
      setPlants(rawPlants);
    } catch (e) {
      // Handle plant refresh fail
    }
  };

  function openDocumentationForm(plant) {
    setDocumentationSuccess("");
    setDocumentationError("");
    setDocumentationPlant(plant);
    setDocumentationText(plant?.documentation || "");
    setIsDocumentationFormOpen(true);
  }

  function closeDocumentationForm() {
    setIsDocumentationFormOpen(false);
    setDocumentationPlant(null);
    setDocumentationText("");
    setDocumentationSubmitting(false);
    setDocumentationError("");
  }

  async function handleSaveDocumentation(event) {
    event.preventDefault();

    if (!documentationPlant?.id) {
      setDocumentationError("Plant introuvable.");
      return;
    }

    setDocumentationSubmitting(true);
    setDocumentationError("");
    setDocumentationSuccess("");

    try {
      await updatePlantDocumentation(documentationPlant.id, documentationText);
      await refreshPlants();
      setDocumentationSuccess("Documentation enregistree.");
      setIsDocumentationFormOpen(false);
      setDocumentationPlant(null);
      setDocumentationText("");
    } catch (error) {
      setDocumentationError(
        error.response?.data?.message || "Impossible d'enregistrer la documentation."
      );
    } finally {
      setDocumentationSubmitting(false);
    }
  }

  function handlePlantInputChange(e) {
    const { name, value } = e.target;
    setPlantFormState(cur => ({ ...cur, [name]: value }));
  }

  async function handleCreatePlant(e) {
    e.preventDefault();
    setPlantSubmitting(true);
    setPlantFormError("");

    try {
      await createPlant({
        parcelle_id: parcelleId,
        espece_id: plantFormState.espece_id,
        date_plantation: plantFormState.date_plantation,
        status: plantFormState.status,
        lat: Number(plantFormState.lat),
        lng: Number(plantFormState.lng)
      });
      await fetchData();
      await refreshPlants();
      setIsPlantFormOpen(false);
      setPlantFormState({
        espece_id: "",
        date_plantation: new Date().toISOString().slice(0, 10),
        status: "vivant",
        lat: parcelle?.lat || "",
        lng: parcelle?.lng || ""
      });
      setEspeceSearch("");
    } catch (error) {
      setPlantFormError(error.response?.data?.message || "Erreur de création du plant.");
    } finally {
      setPlantSubmitting(false);
    }
  }

  if (loading) {
    return <section className="users-page"><p className="muted-text">Chargement des détails de la parcelle...</p></section>;
  }

  if (!parcelle || errorMessage) {
    return <section className="users-page"><p className="form-error">{errorMessage || "Parcelle introuvable"}</p></section>;
  }

  const objectifCible = parcelle.objectif || 0;
  const objectifAtteint = parcelle.objectif_atteint || 0;
  const progressPercentage = objectifCible > 0 ? Math.min((objectifAtteint / objectifCible) * 100, 100) : 0;
  const canManage = ["administrateur", "agent terrain"].includes(role);

  return (
    <section className="users-page" style={{ paddingBottom: "4rem" }}>
      {/* Breadcrumb / Top Return */}
      <div style={{ marginBottom: "1.5rem" }}>
        <Link to={`/dashboard/projet/${selectedProjectId}/parcelles`} style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", textDecoration: "none", color: "var(--muted-text)", fontWeight: "500", fontSize: "0.95rem" }}>
          <ArrowLeft size={16} />
          Retour aux parcelles
        </Link>
      </div>

      <div className="users-toolbar">
        <div className="users-hero" style={{ margin: 0 }}>
          <div>
            <h1>{parcelle.nom || `Parcelle #${parcelle.id}`}</h1>
            {/* <p style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
              <span>Détails et évolution de la zone</span>
              <ChevronRight size={14} />
              <strong style={{ color: "var(--primary)" }}>{parcelle.projet?.nom || "Projet Actif"}</strong>
            </p> */}
          </div>
        </div>
      </div>

      {/* Row 1: Objective and Evolution */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "1.5rem", marginBottom: "2rem" }}>
        {/* Objectif Block */}
        <article style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", padding: "1.5rem" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
            <p className="eyebrow" style={{ margin: 0, display: "flex", alignItems: "center", gap: "0.5rem" }}><Target size={16} /> Objectif de la parcelle</p>
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: "0.75rem" }}>
            <h2 style={{ fontSize: "2.5rem", margin: 0, color: "var(--text)" }}>{objectifAtteint}</h2>
            <span style={{ fontSize: "1.5rem", fontWeight: "600", color: "var(--muted-text)" }}>/ {objectifCible}</span>
          </div>
        </article>

        {/* Evolution Block */}
        <article style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", padding: "1.5rem", display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <p className="eyebrow" style={{ margin: "0 0 1rem 0", display: "flex", alignItems: "center", gap: "0.5rem" }}><Activity size={16} /> Évolution de l'objectif</p>

          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: "0.5rem" }}>
            <span style={{ fontWeight: "600", fontSize: "1.1rem" }}>{progressPercentage.toFixed(1)}% Réalisé</span>
            <span style={{ color: "var(--muted-text)", fontSize: "0.9rem" }}>{objectifCible - objectifAtteint > 0 ? `${objectifCible - objectifAtteint} restants` : "Cible atteinte !"}</span>
          </div>

          <div style={{ width: "100%", height: "12px", background: "var(--surface-hover)", borderRadius: "6px", overflow: "hidden", position: "relative" }}>
            <div
              style={{
                position: "absolute", left: 0, top: 0, bottom: 0,
                width: `${progressPercentage}%`,
                background: progressPercentage >= 100 ? "#10b981" : "var(--primary)",
                borderRadius: "6px",
                transition: "width 0.5s ease"
              }}
            />
          </div>
        </article>
      </div>

      {/* Row 2: 4 Info Blocks */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1.5rem", marginBottom: "2.5rem" }}>
        <article className="dashboard-stat-card">
          <div className="dashboard-stat-icon"><MapPinned size={16} strokeWidth={2.1} /></div>
          <div>
            <p>Ville</p>
            <h3 style={{ fontSize: "1.1rem" }}>{parcelle.ville || "-"}</h3>
          </div>
        </article>
        <article className="dashboard-stat-card">
          <div className="dashboard-stat-icon"><ZoomIn size={16} strokeWidth={2.1} /></div>
          <div>
            <p>Superficie</p>
            <h3 style={{ fontSize: "1.1rem" }}>{parcelle.superficie || "0"} ha</h3>
          </div>
        </article>
        <article className="dashboard-stat-card">
          <div className="dashboard-stat-icon"><Building2 size={16} strokeWidth={2.1} /></div>
          <div>
            <p>Coopérative</p>
            <h3 style={{ fontSize: "1.1rem" }}>{parcelle.cooperative?.nom || "-"}</h3>
          </div>
        </article>
        <article className="dashboard-stat-card">
          <div className="dashboard-stat-icon"><Crosshair size={16} strokeWidth={2.1} /></div>
          <div>
            <p>Plants enregistrés</p>
            <h3 style={{ fontSize: "1.1rem" }}>{plants.length}</h3>
          </div>
        </article>
      </div>

      {/* Plants Table Section */}
      <section className="users-table-panel">
        <div className="users-table-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3>Liste des plants de la parcelle</h3>
          {canManage && (
            <button type="button" className="dashboard-add-button" onClick={() => setIsPlantFormOpen(!isPlantFormOpen)}>
              {isPlantFormOpen ? <X size={14} strokeWidth={2.4} /> : <Plus size={14} strokeWidth={2.4} />}
              {isPlantFormOpen ? "Fermer" : "Ajouter un plant"}
            </button>
          )}
        </div>

        {/* Inline Create Form */}
        {isPlantFormOpen && (
          <div style={{ padding: "1.5rem", background: "var(--surface-hover)", borderBottom: "1px solid var(--border)" }}>
            <h3 style={{ marginTop: 0, marginBottom: "1rem", fontSize: "1.1rem" }}>Enregistrer un nouveau plant</h3>
            {plantFormError && <p className="form-error" style={{ marginBottom: "1rem" }}>{plantFormError}</p>}

            <form onSubmit={handleCreatePlant} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1rem", alignItems: "start" }}>
              <div className="filter-field" style={{ position: "relative" }}>
                <span>Espèce (Autocomplétion)</span>
                <input
                  type="text"
                  placeholder="Rechercher une espèce..."
                  value={especeSearch}
                  onChange={(e) => {
                    setEspeceSearch(e.target.value);
                    setShowEspeceDropdown(true);
                    setPlantFormState(cur => ({ ...cur, espece_id: "" }));
                  }}
                  onFocus={() => setShowEspeceDropdown(true)}
                  required
                />
                {showEspeceDropdown && especeSearch && !plantFormState.espece_id && (
                  <ul
                    style={{
                      position: "absolute", top: "100%", left: 0, right: 0, zIndex: 10,
                      background: "var(--surface)", border: "1px solid var(--border)",
                      maxHeight: "150px", overflowY: "auto", listStyle: "none", padding: 0, margin: 0,
                      boxShadow: "var(--shadow-md)"
                    }}
                  >
                    {especes
                      .filter(e =>
                        e.nom_commun?.toLowerCase().includes(especeSearch.toLowerCase()) ||
                        e.nom_scientifique?.toLowerCase().includes(especeSearch.toLowerCase())
                      )
                      .map(e => (
                        <li
                          key={e.id}
                          style={{ padding: "0.75rem", cursor: "pointer", borderBottom: "1px solid var(--border-soft)" }}
                          onMouseDown={(evt) => evt.preventDefault()}
                          onClick={() => {
                            setPlantFormState(cur => ({ ...cur, espece_id: e.id }));
                            setEspeceSearch(`${e.nom_commun} (${e.nom_scientifique})`);
                            setShowEspeceDropdown(false);
                          }}
                        >
                          <strong>{e.nom_commun}</strong> <span style={{ color: "var(--muted-text)", fontSize: "0.85em" }}>({e.nom_scientifique})</span>
                        </li>
                      ))}
                  </ul>
                )}
              </div>

              <label className="filter-field">
                <span>Date de plantation</span>
                <input type="date" name="date_plantation" value={plantFormState.date_plantation} onChange={handlePlantInputChange} required />
              </label>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: "1rem" }}>
                <label className="filter-field">
                  <span>GPS Lat</span>
                  <input type="number" step="0.00000001" name="lat" value={plantFormState.lat} onChange={handlePlantInputChange} required />
                </label>
                <label className="filter-field">
                  <span>GPS Lng</span>
                  <input type="number" step="0.00000001" name="lng" value={plantFormState.lng} onChange={handlePlantInputChange} required />
                </label>
              </div>

              <label className="filter-field">
                <span>État</span>
                <select name="status" value={plantFormState.status} onChange={handlePlantInputChange} required>
                  <option value="vivant">Vivant</option>
                  <option value="mort">Mort</option>
                </select>
              </label>

              <div style={{ gridColumn: "1 / -1", display: "flex", justifyContent: "flex-end" }}>
                <button type="submit" className="primary-action" disabled={plantSubmitting}>
                  {plantSubmitting ? "Enregistrement..." : "Créer le plant"}
                </button>
              </div>
            </form>
          </div>
        )}

        {canManage && isDocumentationFormOpen ? (
          <div style={{ padding: "1.5rem", background: "var(--surface-hover)", borderBottom: "1px solid var(--border)" }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "12px" }}>
              <div>
                <h3 style={{ marginTop: 0, marginBottom: "0.25rem", fontSize: "1.1rem" }}>
                  Documenter le plant #{documentationPlant?.id}
                </h3>
                <p className="muted-text" style={{ marginTop: 0 }}>
                  {documentationPlant?.espece?.nom_commun || "Espece"} ({documentationPlant?.espece?.nom_scientifique || "-"})
                </p>
              </div>
              <button
                type="button"
                className="secondary-action"
                onClick={closeDocumentationForm}
                disabled={documentationSubmitting}
              >
                Fermer
              </button>
            </div>

            {documentationError ? (
              <p className="form-error" style={{ marginBottom: "1rem" }}>
                {documentationError}
              </p>
            ) : null}

            <form onSubmit={handleSaveDocumentation} style={{ display: "grid", gap: "12px" }}>
              <label className="filter-field">
                <span>Documentation</span>
                <textarea
                  rows={4}
                  value={documentationText}
                  onChange={(event) => setDocumentationText(event.target.value)}
                  placeholder="Decrivez l'observation, les actions menees, ou toute information utile..."
                />
              </label>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                <button type="submit" className="primary-action" disabled={documentationSubmitting}>
                  {documentationSubmitting ? "Enregistrement..." : "Enregistrer"}
                </button>
                <button type="button" className="secondary-action" onClick={closeDocumentationForm} disabled={documentationSubmitting}>
                  Annuler
                </button>
              </div>
            </form>
          </div>
        ) : null}

        {documentationSuccess ? (
          <p className="evolution-success" style={{ margin: "12px 18px 0" }}>
            {documentationSuccess}
          </p>
        ) : null}

        {/* Plants Data Table */}
        {!loadingPlants && plants.length === 0 ? (
          <p className="muted-text" style={{ padding: "1.5rem" }}>Aucun plant enregistré pour cette parcelle.</p>
        ) : null}

        {loadingPlants ? (
          <p className="muted-text" style={{ padding: "1.5rem" }}>Chargement des plants...</p>
        ) : null}

        {!loadingPlants && plants.length > 0 && (
          <div className="users-table-wrapper">
            <table className="users-table">
              <thead>
                <tr>
                  <th>Espèce</th>
                  <th>Nom scientifique</th>
                  <th>GPS</th>
                  <th>Date de plantation</th>
                  <th>État</th>
                  <th>Documenter</th>
                </tr>
              </thead>
              <tbody>
                {plants.map(plant => (
                  <tr key={plant.id}>
                    <td><strong>{plant.espece?.nom_commun || "Inconnu"}</strong></td>
                    <td><em style={{ color: "var(--muted-text)" }}>{plant.espece?.nom_scientifique || "-"}</em></td>
                    <td><span style={{ fontSize: "0.85rem", background: "var(--surface-hover)", padding: "0.2rem 0.5rem", borderRadius: "10px" }}>{plant.lat}, {plant.lng}</span></td>
                    <td>{plant.date_plantation ? new Date(plant.date_plantation).toLocaleDateString() : "-"}</td>
                    <td>
                      <span style={{
                        display: "inline-flex", alignItems: "center", gap: "0.25rem", padding: "0.25rem 0.5rem", borderRadius: "20px", fontSize: "0.85rem", fontWeight: "500",
                        background: plant.status === "vivant" ? "rgba(16, 185, 129, 0.1)" : "rgba(239, 68, 68, 0.1)",
                        color: plant.status === "vivant" ? "#10b981" : "#ef4444"
                      }}>
                        {plant.status === "vivant" ? <CheckCircle2 size={12} /> : <X size={12} />}
                        {plant.status === "vivant" ? "Vivant" : "Mort"}
                      </span>
                    </td>
                    <td>
                      {canManage ? (
                        <button
                          type="button"
                          className="secondary-action"
                          style={{ padding: "6px 10px", fontSize: "0.85rem", display: "inline-flex", alignItems: "center", gap: "6px" }}
                          onClick={() => openDocumentationForm(plant)}
                        >
                          <FileText size={14} strokeWidth={2} />
                          Documenter
                        </button>
                      ) : (
                        <span className="muted-text">--</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

    </section>
  );
}

export default ParcelleDetailsPage;
