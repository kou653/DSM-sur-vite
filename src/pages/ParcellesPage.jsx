import { MapPinned, Pencil, Plus, Search, Trash2, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../contexts/auth-context.js";
import {
  createProjetParcelle,
  getProjetParcelles,
  deleteParcelle,
  updateParcelle,
} from "../api/parcelles.js";
import { getProjetCooperatives } from "../api/referentiels.js";

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
  };
}

function ParcellesPage() {
  const { role, selectedProjectId } = useAuth();
  const [parcelles, setParcelles] = useState([]);
  const [cooperatives, setCooperatives] = useState([]);

  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const [actionError, setActionError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingParcelle, setEditingParcelle] = useState(null);
  const [formState, setFormState] = useState(buildInitialFormState());

  const fetchParcelles = useCallback(async () => {
    if (!selectedProjectId) {
      setParcelles([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setErrorMessage("");

    try {
      const [parcellesRes, coopRes] = await Promise.all([
        getProjetParcelles(selectedProjectId),
        getProjetCooperatives(selectedProjectId)
      ]);

      setParcelles(normalizeParcelles(parcellesRes.data));
      setCooperatives(normalizeOptions(coopRes.data, 'cooperatives'));
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
    setActionError("");
    setSuccessMessage("");
    setIsFormOpen(true);
  }

  function openEditForm(parcelle) {
    setEditingParcelle(parcelle);
    setFormState(buildInitialFormState(parcelle));
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

  async function handleDeleteParcelle(parcelle) {
    const confirmed = window.confirm(
      `Voulez-vous vraiment supprimer la parcelle ${parcelle.name} ?`
    );

    if (!confirmed) {
      return;
    }

    setSubmitting(true);
    setActionError("");
    setSuccessMessage("");

    try {
      await deleteParcelle(parcelle.id);
      setSuccessMessage("Parcelle supprimée avec succès.");
      await fetchParcelles();
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

      <div className="dashboard-stat-grid" style={{ gridTemplateColumns: "repeat(3, 1fr)", marginBottom: "1rem", gap: "1.5rem" }}>
        <article style={{ 
          background: "#ffffff", 
          display: "flex", 
          flexDirection: "column", 
          alignItems: "center", 
          justifyContent: "center", 
          padding: "3rem 1.5rem", 
          textAlign: "center",
          borderRadius: "var(--radius-md)",
          boxShadow: "var(--shadow-sm)"
        }}>
          <p style={{ margin: "0 0 0.5rem 0", color: "var(--muted-text)", fontWeight: "600", fontSize: "1.05rem" }}>Total parcelles</p>
          <h3 style={{ margin: 0, fontSize: "1.6rem", fontWeight: "700", color: "var(--text)" }}>{parcelles.length}</h3>
        </article>

        <article style={{ 
          background: "#ffffff", 
          display: "flex", 
          flexDirection: "column", 
          alignItems: "center", 
          justifyContent: "center", 
          padding: "3rem 1.5rem", 
          textAlign: "center",
          borderRadius: "var(--radius-md)",
          boxShadow: "var(--shadow-sm)"
        }}>
          <p style={{ margin: "0 0 0.5rem 0", color: "var(--muted-text)", fontWeight: "600", fontSize: "1.05rem" }}>Superficie totale</p>
          <h3 style={{ margin: 0, fontSize: "1.6rem", fontWeight: "700", color: "var(--text)" }}>{totalArea.toFixed(2)} ha</h3>
        </article>

        <article style={{ 
          background: "#ffffff", 
          display: "flex", 
          flexDirection: "column", 
          alignItems: "center", 
          justifyContent: "center", 
          padding: "3rem 1.5rem", 
          textAlign: "center",
          borderRadius: "var(--radius-md)",
          boxShadow: "var(--shadow-sm)"
        }}>
          <p style={{ margin: "0 0 0.5rem 0", color: "var(--muted-text)", fontWeight: "600", fontSize: "1.05rem" }}>Coopératives</p>
          <h3 style={{ margin: 0, fontSize: "1.6rem", fontWeight: "700", color: "var(--text)" }}>{uniqueCooperativesCount}</h3>
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

            <label className="filter-field">
              <span>Coopérative</span>
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
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: "1.5rem",
          marginTop: "0.5rem"
        }}>
          {filteredParcelles.map((parcelle) => (
            <div key={parcelle.id} style={{ position: "relative" }}>
              {role === "administrateur" && (
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    handleDeleteParcelle(parcelle);
                  }}
                  className="project-card-delete-button"
                  title="Supprimer la parcelle"
                  style={{
                    position: "absolute",
                    top: "0.5rem",
                    left: "0.5rem",
                    zIndex: 2
                  }}
                  disabled={submitting}
                >
                  <Trash2 size={14} />
                </button>
              )}

              <Link
                to={String(parcelle.id)}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "#ffffff",
                  borderRadius: "var(--radius-md)",
                  padding: "3rem 1.5rem",
                  textAlign: "center",
                  textDecoration: "none",
                  color: "var(--text)",
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
