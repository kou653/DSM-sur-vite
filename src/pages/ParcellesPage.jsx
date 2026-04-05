import { MapPinned, Pencil, Plus, Search, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../contexts/auth-context.js";
import {
  createProjetParcelle,
  getProjetParcelles,
  updateParcelle,
} from "../api/parcelles.js";
import { getEspeces, getProjetCooperatives } from "../api/referentiels.js";

function normalizeParcelles(payload) {
  const rawParcelles = Array.isArray(payload)
    ? payload
    : payload?.parcelles || payload?.data || [];

  return rawParcelles.map((parcelle) => ({
    id: Number(parcelle.id),
    code: `PAR${parcelle.id}`,
    name: parcelle.nom || `Parcelle ${parcelle.id}`,
    area: Number(parcelle.superficie) || 0,
    objectif: parcelle.objectif ?? null,
    city: parcelle.ville || "Ville non renseignee",
    cooperativeName: parcelle.cooperative?.nom || "Cooperative non renseignee",
    especeName: parcelle.espece?.nom_commun || "Espece non définie",
    especeScientific: parcelle.espece?.nom_scientifique || "",
    raw: parcelle,
  }));
}

function normalizeOptions(payload, key) {
  const data = Array.isArray(payload) ? payload : payload?.[key] || payload?.data || [];
  return data;
}

function buildInitialFormState(parcelle = null) {
  return {
    nom: parcelle?.raw?.nom || "",
    ville: parcelle?.raw?.ville || "",
    cooperative_id: parcelle?.raw?.cooperative_id || "",
    superficie: parcelle?.raw?.superficie || "",
    lat: parcelle?.raw?.lat || "",
    lng: parcelle?.raw?.lng || "",
    objectif: parcelle?.raw?.objectif || "",
    espece_id: parcelle?.raw?.espece_id || "",
  };
}

function ParcellesPage() {
  const { role, selectedProjectId } = useAuth();
  const [parcelles, setParcelles] = useState([]);
  const [cooperatives, setCooperatives] = useState([]);
  const [especes, setEspeces] = useState([]);

  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  
  const [actionError, setActionError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingParcelle, setEditingParcelle] = useState(null);
  const [formState, setFormState] = useState(buildInitialFormState());

  const [especeSearch, setEspeceSearch] = useState("");
  const [showEspeceDropdown, setShowEspeceDropdown] = useState(false);

  const fetchParcelles = useCallback(async () => {
    if (!selectedProjectId) {
      setParcelles([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setErrorMessage("");

    try {
      const [parcellesRes, coopRes, espRes] = await Promise.all([
        getProjetParcelles(selectedProjectId),
        getProjetCooperatives(selectedProjectId),
        getEspeces()
      ]);

      setParcelles(normalizeParcelles(parcellesRes.data));
      setCooperatives(normalizeOptions(coopRes.data, 'cooperatives'));
      setEspeces(normalizeOptions(espRes.data, 'especes'));
    } catch (error) {
      setErrorMessage(
        error.response?.data?.message || "Impossible de charger les sous-donnees du projet."
      );
    } finally {
      setLoading(false);
    }
  }, [selectedProjectId]);

  useEffect(() => {
    fetchParcelles();
  }, [fetchParcelles]);

  const filteredParcelles = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    if (!normalizedSearch) {
      return parcelles;
    }

    return parcelles.filter((p) =>
      [p.name, p.code, p.city, p.cooperativeName, p.especeName]
        .join(" ")
        .toLowerCase()
        .includes(normalizedSearch)
    );
  }, [parcelles, searchTerm]);

  // Statistics Calculation
  const totalArea = useMemo(() => {
    return parcelles.reduce((acc, p) => acc + p.area, 0);
  }, [parcelles]);

  const uniqueCooperativesCount = useMemo(() => {
    const coops = new Set();
    parcelles.forEach(p => {
      if (p.raw.cooperative_id) coops.add(p.raw.cooperative_id);
    });
    return coops.size;
  }, [parcelles]);

  // Form handling functions
  function openCreateForm() {
    setEditingParcelle(null);
    setFormState(buildInitialFormState());
    setEspeceSearch("");
    setActionError("");
    setSuccessMessage("");
    setIsFormOpen(true);
  }

  function openEditForm(parcelle) {
    setEditingParcelle(parcelle);
    setFormState(buildInitialFormState(parcelle));
    
    if (parcelle.raw?.espece) {
      setEspeceSearch(`${parcelle.raw.espece.nom_commun} (${parcelle.raw.espece.nom_scientifique})`);
    } else {
      setEspeceSearch("");
    }
    
    setActionError("");
    setSuccessMessage("");
    setIsFormOpen(true);
  }

  function closeForm() {
    setIsFormOpen(false);
    setEditingParcelle(null);
    setFormState(buildInitialFormState());
    setActionError("");
  }

  function handleInputChange(event) {
    const { name, value } = event.target;
    setFormState((current) => ({
      ...current,
      [name]: value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    setActionError("");
    setSuccessMessage("");

    const payload = { ...formState };
    if (payload.objectif) payload.objectif = Number(payload.objectif);
    if (!payload.objectif) delete payload.objectif;

    try {
      if (editingParcelle) {
        await updateParcelle(editingParcelle.id, payload);
        setSuccessMessage("Parcelle modifiée avec succès.");
      } else {
        await createProjetParcelle(selectedProjectId, payload);
        setSuccessMessage("Parcelle ajoutée avec succès.");
      }

      await fetchParcelles();
      closeForm();
    } catch (error) {
      setActionError(
        error.response?.data?.message || "Operation impossible pour cette parcelle."
      );
    } finally {
      setSubmitting(false);
    }
  }

  const canManage = ["administrateur", "agent terrain"].includes(role);

  return (
    <section className="users-page">
      <div className="users-toolbar">
        <div className="users-hero">
          <div className="users-hero-icon" aria-hidden="true">
            <MapPinned size={22} strokeWidth={2.1} />
          </div>
          <div>
            <h1>Parcelles</h1>
            <p>Liste des parcelles du projet sélectionné</p>
          </div>
        </div>

        <div className="users-toolbar-actions">
          <label className="users-search">
            <Search size={16} strokeWidth={2} />
            <input
              type="search"
              placeholder="Rechercher une parcelle..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
          </label>

          {canManage ? (
            <button type="button" className="dashboard-add-button" onClick={openCreateForm}>
              <Plus size={14} strokeWidth={2.4} />
              Ajouter
            </button>
          ) : null}
        </div>
      </div>

      {errorMessage ? <p className="form-error">{errorMessage}</p> : null}
      {actionError ? <p className="form-error">{actionError}</p> : null}
      {successMessage ? <p className="evolution-success">{successMessage}</p> : null}

      <div className="dashboard-stat-grid" style={{ marginBottom: "2rem" }}>
        <article className="dashboard-stat-card">
          <div className="dashboard-stat-icon">
            <MapPinned size={16} strokeWidth={2.1} />
          </div>
          <div>
            <p>Total parcelles</p>
            <h3>{parcelles.length}</h3>
          </div>
        </article>
        
        <article className="dashboard-stat-card">
          <div className="dashboard-stat-icon">
            <MapPinned size={16} strokeWidth={2.1} />
          </div>
          <div>
            <p>Superficie totale</p>
            <h3>{totalArea.toFixed(2)} ha</h3>
          </div>
        </article>

        <article className="dashboard-stat-card">
          <div className="dashboard-stat-icon">
            <MapPinned size={16} strokeWidth={2.1} />
          </div>
          <div>
            <p>Coopératives</p>
            <h3>{uniqueCooperativesCount}</h3>
          </div>
        </article>
      </div>

      {isFormOpen ? (
        <section className="users-form-panel">
          <div className="users-form-header">
            <div>
              <p className="eyebrow">{editingParcelle ? "Modifier" : "Creation"}</p>
              <h2>
                {editingParcelle ? "Modifier une parcelle" : "Ajouter une parcelle"}
              </h2>
            </div>
            <button type="button" className="secondary-action" onClick={closeForm}>
              <X size={16} strokeWidth={2} />
              Fermer
            </button>
          </div>

          <form className="users-form" onSubmit={handleSubmit}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <label className="filter-field">
                <span>Nom de la parcelle</span>
                <input type="text" name="nom" value={formState.nom} onChange={handleInputChange} required />
              </label>

              <label className="filter-field">
                <span>Ville</span>
                <input type="text" name="ville" value={formState.ville} onChange={handleInputChange} required />
              </label>
            </div>

            <div className="filter-field" style={{ position: "relative" }}>
              <span>Espèce principale (Autocomplétion)</span>
              <input
                type="text"
                placeholder="Commencez à taper le nom de l'espèce..."
                value={especeSearch}
                onChange={(e) => {
                  setEspeceSearch(e.target.value);
                  setShowEspeceDropdown(true);
                  if (formState.espece_id) {
                    setFormState(cur => ({ ...cur, espece_id: "" })); 
                  }
                }}
                onFocus={() => setShowEspeceDropdown(true)}
              />
              {showEspeceDropdown && especeSearch && !formState.espece_id && (
                <ul
                  style={{
                    position: "absolute", top: "100%", left: 0, right: 0, zIndex: 10,
                    background: "var(--surface)", border: "1px solid var(--border)",
                    borderRadius: "0 0 6px 6px", maxHeight: "180px", overflowY: "auto",
                    listStyle: "none", padding: 0, margin: 0, boxShadow: "var(--shadow-md)"
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
                        style={{ padding: "0.75rem", cursor: "pointer", borderBottom: "1px solid var(--border-soft)", display: "flex", justifyContent: "space-between" }}
                        onMouseDown={(evt) => evt.preventDefault()} 
                        onClick={() => {
                          setFormState(cur => ({ ...cur, espece_id: e.id }));
                          setEspeceSearch(`${e.nom_commun} (${e.nom_scientifique})`);
                          setShowEspeceDropdown(false);
                        }}
                      >
                        <strong>{e.nom_commun}</strong>
                        <span style={{ color: "var(--muted-text)", fontSize: "0.85em" }}>{e.nom_scientifique}</span>
                      </li>
                    ))}
                </ul>
              )}
            </div>

            <label className="filter-field">
              <span>Coopérative partenaire</span>
              <select name="cooperative_id" value={formState.cooperative_id} onChange={handleInputChange} required>
                <option value="" disabled>Sélectionner une coopérative</option>
                {cooperatives.map(coop => (
                  <option key={coop.id} value={coop.id}>{coop.nom}</option>
                ))}
              </select>
            </label>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <label className="filter-field">
                <span>Superficie (ha)</span>
                <input type="number" step="0.01" name="superficie" value={formState.superficie} onChange={handleInputChange} required />
              </label>

              <label className="filter-field">
                <span>Objectif de plants</span>
                <input type="number" name="objectif" value={formState.objectif || ""} onChange={handleInputChange} />
              </label>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <label className="filter-field">
                <span>Latitude</span>
                <input type="number" step="0.00000001" name="lat" value={formState.lat} onChange={handleInputChange} required />
              </label>

              <label className="filter-field">
                <span>Longitude</span>
                <input type="number" step="0.00000001" name="lng" value={formState.lng} onChange={handleInputChange} required />
              </label>
            </div>

            <div className="crud-actions">
              <button type="submit" className="primary-action" disabled={submitting}>
                {editingParcelle ? (submitting ? "Mise a jour..." : "Enregistrer") : (submitting ? "Creation..." : "Ajouter")}
              </button>
              <button type="button" className="secondary-action" onClick={closeForm}>Annuler</button>
            </div>
          </form>
        </section>
      ) : null}

      {loading ? <p className="muted-text" style={{ marginTop: "2rem" }}>Chargement des parcelles...</p> : null}

      {!loading && filteredParcelles.length === 0 ? (
        <p className="muted-text" style={{ marginTop: "2rem" }}>Aucune parcelle n'a été trouvée.</p>
      ) : null}

      {!loading && filteredParcelles.length > 0 ? (
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))",
          gap: "1.5rem",
          marginTop: "1.5rem"
        }}>
          {filteredParcelles.map((parcelle) => (
            <div key={parcelle.id} style={{ position: "relative" }}>
               <Link
                 to={`/dashboard/projet/${selectedProjectId}/parcelles/${parcelle.id}`}
                 style={{
                   display: "flex",
                   flexDirection: "column",
                   alignItems: "center",
                   justifyContent: "center",
                   background: "var(--surface)",
                   border: "1px solid var(--border)",
                   borderRadius: "var(--radius-md)",
                   padding: "2.5rem 1rem",
                   textAlign: "center",
                   textDecoration: "none",
                   color: "var(--text)",
                   transition: "transform 0.15s ease, box-shadow 0.15s ease",
                   cursor: "pointer",
                   height: "100%",
                 }}
                 className="hover-card-effect"
               >
                 <h3 style={{ margin: "0 0 0.5rem 0", fontSize: "1.15rem" }}>{parcelle.name}</h3>
                 <p style={{ margin: 0, color: "var(--primary)", fontWeight: "500" }}>{parcelle.area} ha</p>
               </Link>

               {canManage && (
                 <button
                   onClick={(e) => {
                     e.preventDefault();
                     openEditForm(parcelle);
                   }}
                   title="Modifier la parcelle"
                   style={{
                     position: "absolute",
                     top: "0.5rem",
                     right: "0.5rem",
                     background: "var(--surface-hover)",
                     border: "none",
                     borderRadius: "50%",
                     width: "32px",
                     height: "32px",
                     display: "flex",
                     alignItems: "center",
                     justifyContent: "center",
                     cursor: "pointer",
                     color: "var(--muted-text)"
                   }}
                 >
                   <Pencil size={14} />
                 </button>
               )}
            </div>
          ))}
        </div>
      ) : null}

    </section>
  );
}

export default ParcellesPage;
