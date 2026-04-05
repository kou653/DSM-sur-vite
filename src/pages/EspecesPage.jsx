import { Leaf, Pencil, Plus, Search, Trash2, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  createEspece,
  deleteEspece,
  getEspeces,
  updateEspece,
} from "../api/referentiels.js";
import { useAuth } from "../contexts/auth-context.js";

function normalizeEspeces(payload) {
  const rawEspeces = Array.isArray(payload)
    ? payload
    : payload?.especes || payload?.data || [];

  return rawEspeces.map((espece) => ({
    id: Number(espece.id),
    name: espece.nom_commun || `Espece ${espece.id}`,
    scientificName: espece.nom_scientifique || "Nom scientifique non renseigne",
    raw: espece,
  }));
}

function buildInitialFormState(espece = null) {
  return {
    nom_commun: espece?.raw?.nom_commun || "",
    nom_scientifique: espece?.raw?.nom_scientifique || "",
  };
}

function EspecesPage() {
  const { role } = useAuth();
  const [especes, setEspeces] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [actionError, setActionError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingEspece, setEditingEspece] = useState(null);
  const [formState, setFormState] = useState(buildInitialFormState());

  async function fetchEspeces() {
    setLoading(true);
    setErrorMessage("");

    try {
      const { data } = await getEspeces();
      setEspeces(normalizeEspeces(data));
    } catch (error) {
      setErrorMessage(
        error.response?.data?.message || "Impossible de charger les especes."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchEspeces();
  }, []);

  const filteredEspeces = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    if (!normalizedSearch) {
      return especes;
    }

    return especes.filter((espece) =>
      [espece.name, espece.scientificName]
        .join(" ")
        .toLowerCase()
        .includes(normalizedSearch)
    );
  }, [especes, searchTerm]);

  function openCreateForm() {
    setEditingEspece(null);
    setFormState(buildInitialFormState());
    setActionError("");
    setSuccessMessage("");
    setIsFormOpen(true);
  }

  function openEditForm(espece) {
    setEditingEspece(espece);
    setFormState(buildInitialFormState(espece));
    setActionError("");
    setSuccessMessage("");
    setIsFormOpen(true);
  }

  function closeForm() {
    setIsFormOpen(false);
    setEditingEspece(null);
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

    const payload = {
      nom_commun: formState.nom_commun.trim(),
      nom_scientifique: formState.nom_scientifique.trim(),
    };

    try {
      if (editingEspece) {
        await updateEspece(editingEspece.id, payload);
        setSuccessMessage("Espece modifiee avec succes.");
      } else {
        await createEspece(payload);
        setSuccessMessage("Espece ajoutee avec succes.");
      }

      await fetchEspeces();
      closeForm();
    } catch (error) {
      setActionError(
        error.response?.data?.message || "Operation impossible pour cette espece."
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(espece) {
    const confirmed = window.confirm(
      `Voulez-vous vraiment supprimer l'espece ${espece.name} ?`
    );

    if (!confirmed) {
      return;
    }

    setSubmitting(true);
    setActionError("");
    setSuccessMessage("");

    try {
      await deleteEspece(espece.id);
      setSuccessMessage("Espece supprimee avec succes.");
      await fetchEspeces();
    } catch (error) {
      setActionError(
        error.response?.data?.message || "Suppression impossible pour cette espece."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="users-page">
      <div className="users-toolbar">
        <div className="users-hero">
          <div className="users-hero-icon" aria-hidden="true">
            <Leaf size={22} strokeWidth={2.1} />
          </div>
          <div>
            <h1>Espèces</h1>
            <p>Catalogue des espèces végétales.</p>
          </div>
        </div>

        <div className="users-toolbar-actions">
          <label className="users-search">
            <Search size={16} strokeWidth={2} />
            <input
              type="search"
              placeholder="Rechercher..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
          </label>

          {role === "administrateur" ? (
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

      <div className="cooperatives-summary-grid">
        <article className="cooperatives-summary-card">
          <p>Total espèces référencées</p>
          <h2>{especes.length}</h2>
        </article>
      </div>

      {isFormOpen ? (
        <section className="users-form-panel">
          <div className="users-form-header">
            <div>
              <p className="eyebrow">{editingEspece ? "Modifier" : "Creation"}</p>
              <h2>
                {editingEspece ? "Modifier une espèce" : "Enregistrer une espèce"}
              </h2>
            </div>

            <button type="button" className="secondary-action" onClick={closeForm}>
              <X size={16} strokeWidth={2} />
              Fermer
            </button>
          </div>

          <form className="users-form" onSubmit={handleSubmit}>
            <label className="filter-field">
              <span>Nom commun</span>
              <input
                type="text"
                name="nom_commun"
                value={formState.nom_commun}
                onChange={handleInputChange}
                required
              />
            </label>

            <label className="filter-field">
              <span>Nom scientifique</span>
              <input
                type="text"
                name="nom_scientifique"
                value={formState.nom_scientifique}
                onChange={handleInputChange}
                required
              />
            </label>

            <div className="crud-actions">
              <button type="submit" className="primary-action" disabled={submitting}>
                {editingEspece
                  ? submitting
                    ? "Mise a jour..."
                    : "Enregistrer"
                  : submitting
                    ? "Creation..."
                    : "Ajouter"}
              </button>
              <button type="button" className="secondary-action" onClick={closeForm}>
                Annuler
              </button>
            </div>
          </form>
        </section>
      ) : null}

      <section className="users-table-panel">
        <div className="users-table-header">
          <h2>Liste des espèces</h2>
        </div>

        {loading ? <p className="muted-text">Chargement des espèces...</p> : null}

        {!loading && filteredEspeces.length === 0 ? (
          <p className="muted-text">Aucune espèce ne correspond à la recherche.</p>
        ) : null}

        {!loading && filteredEspeces.length > 0 ? (
          <div className="users-table-wrapper">
            <table className="users-table">
              <thead>
                <tr>
                  <th>Nom commun</th>
                  <th>Nom scientifique</th>
                  {role === "administrateur" ? <th>Actions</th> : null}
                </tr>
              </thead>
              <tbody>
                {filteredEspeces.map((espece) => (
                  <tr key={espece.id}>
                    <td>
                      <div className="users-name-cell">
                        <div className="users-avatar">{espece.name.charAt(0).toUpperCase()}</div>
                        <span><strong>{espece.name}</strong></span>
                      </div>
                    </td>
                    <td>{espece.scientificName}</td>
                    {role === "administrateur" ? (
                      <td>
                        <div className="users-table-actions">
                          <button
                            type="button"
                            className="secondary-action users-icon-button"
                            onClick={() => openEditForm(espece)}
                            disabled={submitting}
                          >
                            <Pencil size={14} strokeWidth={2} />
                          </button>
                          <button
                            type="button"
                            className="danger-action users-icon-button"
                            onClick={() => handleDelete(espece)}
                            disabled={submitting}
                          >
                            <Trash2 size={14} strokeWidth={2} />
                          </button>
                        </div>
                      </td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>
    </section>
  );
}

export default EspecesPage;
