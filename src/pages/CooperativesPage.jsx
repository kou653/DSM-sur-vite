import { Pencil, Plus, Search, Trash2, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  createProjetCooperative,
  deleteCooperative,
  getProjetCooperatives,
  updateCooperative,
} from "../api/referentiels.js";
import { useAuth } from "../contexts/auth-context.js";

function normalizeCooperatives(payload) {
  const rawCooperatives = Array.isArray(payload)
    ? payload
    : payload?.cooperatives || payload?.data || [];

  return rawCooperatives.map((cooperative) => ({
    id: Number(cooperative.id),
    nom: cooperative.nom || `Cooperative ${cooperative.id}`,
    entreprise: cooperative.entreprise || "Entreprise non renseignee",
    contact: cooperative.contact || "Contact non renseigne",
    email: cooperative.email || "Email non renseigne",
    ville: cooperative.ville || "Ville non renseignee",
    village: cooperative.village || "Village non renseigne",
    raw: cooperative,
  }));
}

function buildInitialFormState(cooperative = null) {
  return {
    nom: cooperative?.raw?.nom || "",
    entreprise: cooperative?.raw?.entreprise || "",
    contact: cooperative?.raw?.contact || "",
    email: cooperative?.raw?.email || "",
    ville: cooperative?.raw?.ville || "",
    village: cooperative?.raw?.village ?? "",
  };
}

function CooperativesPage() {
  const { role, selectedProjectId } = useAuth();
  const [cooperatives, setCooperatives] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [actionError, setActionError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCooperative, setEditingCooperative] = useState(null);
  const [formState, setFormState] = useState(buildInitialFormState());

  async function fetchCooperatives() {
    if (!selectedProjectId) {
      setCooperatives([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setErrorMessage("");

    try {
      const { data } = await getProjetCooperatives(selectedProjectId);
      setCooperatives(normalizeCooperatives(data));
    } catch (error) {
      setErrorMessage(
        error.response?.data?.message || "Impossible de charger les cooperatives."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchCooperatives();
  }, [selectedProjectId]);

  const filteredCooperatives = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    if (!normalizedSearch) {
      return cooperatives;
    }

    return cooperatives.filter((cooperative) =>
      [
        cooperative.nom,
        cooperative.entreprise,
        cooperative.contact,
        cooperative.email,
        cooperative.ville,
        cooperative.village,
      ]
        .join(" ")
        .toLowerCase()
        .includes(normalizedSearch)
    );
  }, [cooperatives, searchTerm]);

  function openCreateForm() {
    setEditingCooperative(null);
    setFormState(buildInitialFormState());
    setActionError("");
    setSuccessMessage("");
    setIsFormOpen(true);
  }

  function openEditForm(cooperative) {
    setEditingCooperative(cooperative);
    setFormState(buildInitialFormState(cooperative));
    setActionError("");
    setSuccessMessage("");
    setIsFormOpen(true);
  }

  function closeForm() {
    setIsFormOpen(false);
    setEditingCooperative(null);
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
      nom: formState.nom.trim(),
      entreprise: formState.entreprise.trim(),
      contact: formState.contact.trim(),
      email: formState.email.trim(),
      ville: formState.ville.trim(),
      village: formState.village.trim() || null,
    };

    try {
      if (editingCooperative) {
        await updateCooperative(editingCooperative.id, payload);
        setSuccessMessage("Cooperative modifiee avec succes.");
      } else {
        await createProjetCooperative(selectedProjectId, payload);
        setSuccessMessage("Cooperative ajoutee avec succes.");
      }

      await fetchCooperatives();
      closeForm();
    } catch (error) {
      setActionError(
        error.response?.data?.message || "Operation impossible pour cette cooperative."
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(cooperative) {
    const confirmed = window.confirm(
      `Voulez-vous vraiment supprimer la cooperative ${cooperative.nom} ?`
    );

    if (!confirmed) {
      return;
    }

    setSubmitting(true);
    setActionError("");
    setSuccessMessage("");

    try {
      await deleteCooperative(cooperative.id);
      setSuccessMessage("Cooperative supprimee avec succes.");
      await fetchCooperatives();
    } catch (error) {
      setActionError(
        error.response?.data?.message || "Suppression impossible pour cette cooperative."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="users-page">
      <div className="users-toolbar">
        <div className="users-hero">
          <div>
            <h1>Gestion des Cooperatives</h1>
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
          <p>Total cooperatives</p>
          <h2>{cooperatives.length}</h2>
        </article>
      </div>

      {isFormOpen ? (
        <section className="users-form-panel">
          <div className="users-form-header">
            <div>
              <p className="eyebrow">{editingCooperative ? "Modifier" : "Creation"}</p>
              <h2>
                {editingCooperative ? "Modifier une cooperative" : "Ajouter une cooperative"}
              </h2>
            </div>

            <button type="button" className="secondary-action" onClick={closeForm}>
              <X size={16} strokeWidth={2} />
              Fermer
            </button>
          </div>

          <form className="users-form" onSubmit={handleSubmit}>
            <label className="filter-field">
              <span>Nom</span>
              <input type="text" name="nom" value={formState.nom} onChange={handleInputChange} required />
            </label>

            <label className="filter-field">
              <span>Entreprise</span>
              <input
                type="text"
                name="entreprise"
                value={formState.entreprise}
                onChange={handleInputChange}
                required
              />
            </label>

            <label className="filter-field">
              <span>Contact</span>
              <input
                type="text"
                name="contact"
                value={formState.contact}
                onChange={handleInputChange}
                required
              />
            </label>

            <label className="filter-field">
              <span>Email</span>
              <input
                type="email"
                name="email"
                value={formState.email}
                onChange={handleInputChange}
                required
              />
            </label>

            <label className="filter-field">
              <span>Ville</span>
              <input
                type="text"
                name="ville"
                value={formState.ville}
                onChange={handleInputChange}
                required
              />
            </label>

            <label className="filter-field">
              <span>Village</span>
              <input
                type="text"
                name="village"
                value={formState.village}
                onChange={handleInputChange}
              />
            </label>

            <div className="crud-actions">
              <button type="submit" className="primary-action" disabled={submitting}>
                {editingCooperative
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
          <h2>Liste des cooperatives</h2>
        </div>

        {loading ? <p className="muted-text">Chargement des cooperatives...</p> : null}

        {!loading && filteredCooperatives.length === 0 ? (
          <p className="muted-text" style={{ marginTop: "1.5rem" }}>Aucune cooperative ne correspond a la recherche.</p>
        ) : null}

        {!loading && filteredCooperatives.length > 0 ? (
          <div className="users-table-wrapper" style={{ overflowX: "auto" }}>
            <table className="users-table">
              <thead>
                <tr>
                  <th>Nom</th>
                  <th>Entreprise</th>
                  <th>Contact</th>
                  <th>Email</th>
                  <th>Ville</th>
                  <th>Village</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredCooperatives.map((cooperative) => (
                  <tr key={cooperative.id}>
                    <td>{cooperative.nom}</td>
                    <td>{cooperative.entreprise}</td>
                    <td>{cooperative.contact}</td>
                    <td>{cooperative.email}</td>
                    <td>{cooperative.ville}</td>
                    <td>{cooperative.village}</td>
                    <td>
                      <div className="users-table-actions">
                        <button
                          type="button"
                          className="secondary-action users-icon-button"
                          onClick={() => openEditForm(cooperative)}
                          disabled={submitting || role !== "administrateur"}
                        >
                          <Pencil size={14} strokeWidth={2} />
                        </button>
                        <button
                          type="button"
                          className="danger-action users-icon-button"
                          onClick={() => handleDelete(cooperative)}
                          disabled={submitting || role !== "administrateur"}
                        >
                          <Trash2 size={14} strokeWidth={2} />
                        </button>
                      </div>
                    </td>
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

export default CooperativesPage;
