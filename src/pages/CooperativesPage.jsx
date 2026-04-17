import { ChevronDown, Pencil, Plus, Search, Trash2, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
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
  const [columnFilters, setColumnFilters] = useState({ nom: "", entreprise: "", ville: "", village: "" });
  const [openDropdown, setOpenDropdown] = useState(null);
  const fetchCooperatives = useCallback(async () => {
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
    } catch {
      setErrorMessage("Impossible de charger les cooperatives.");
    } finally {
      setLoading(false);
    }
  }, [selectedProjectId]);

  useEffect(() => {
    fetchCooperatives();
  }, [selectedProjectId, fetchCooperatives]);

  useEffect(() => {
    if (!openDropdown) return;
    const close = () => setOpenDropdown(null);
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [openDropdown]);

  const filteredCooperatives = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return cooperatives.filter((cooperative) => {
      const matchesSearch =
        !normalizedSearch ||
        [cooperative.nom, cooperative.entreprise, cooperative.contact, cooperative.email, cooperative.ville, cooperative.village]
          .join(" ").toLowerCase().includes(normalizedSearch);

      const matchesNom = !columnFilters.nom || cooperative.nom === columnFilters.nom;
      const matchesEntreprise = !columnFilters.entreprise || cooperative.entreprise === columnFilters.entreprise;
      const matchesVille = !columnFilters.ville || cooperative.ville === columnFilters.ville;
      const matchesVillage = !columnFilters.village || cooperative.village === columnFilters.village;

      return matchesSearch && matchesNom && matchesEntreprise && matchesVille && matchesVillage;
    });
  }, [cooperatives, searchTerm, columnFilters]);

  const uniqueValues = useMemo(() => ({
    nom: [...new Set(cooperatives.map((c) => c.nom))].sort(),
    entreprise: [...new Set(cooperatives.map((c) => c.entreprise))].sort(),
    ville: [...new Set(cooperatives.map((c) => c.ville))].sort(),
    village: [...new Set(cooperatives.map((c) => c.village))].sort(),
  }), [cooperatives]);

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
    } catch {
      setActionError("Operation impossible pour cette cooperative.");
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
    } catch {
      setActionError("Suppression impossible pour cette cooperative.");
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
                  {[
                    { key: "nom", label: "Nom" },
                    { key: "entreprise", label: "Entreprise" },
                  ].map(({ key, label }) => (
                    <th key={key} style={{ position: "relative" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span>{label}</span>
                        <button
                          type="button"
                          style={{ background: "none", border: "none", padding: 0, cursor: "pointer", display: "flex", alignItems: "center" }}
                          onClick={(e) => { e.stopPropagation(); setOpenDropdown((prev) => (prev === key ? null : key)); }}
                        >
                          <ChevronDown size={13} strokeWidth={2} />
                          {columnFilters[key] && (
                            <span style={{ display: "inline-block", width: 7, height: 7, borderRadius: "50%", background: "var(--primary, #16a34a)", marginLeft: 3 }} />
                          )}
                        </button>
                      </div>
                      {openDropdown === key && (
                        <div style={{ position: "absolute", top: "100%", left: 0, zIndex: 50, background: "var(--surface, #fff)", border: "1px solid var(--border, #e2e8f0)", borderRadius: 8, boxShadow: "0 4px 16px rgba(0,0,0,0.10)", minWidth: 200, padding: "6px 0" }}>
                          <button type="button"
                            onClick={() => { setColumnFilters((f) => ({ ...f, [key]: "" })); setOpenDropdown(null); }}
                            style={{ display: "block", width: "100%", textAlign: "left", padding: "7px 14px", background: "none", border: "none", cursor: "pointer", fontStyle: "italic", color: "var(--muted-text, #94a3b8)" }}
                          >
                            Tous
                          </button>
                          {uniqueValues[key].map((val) => (
                            <button key={val} type="button"
                              onClick={() => { setColumnFilters((f) => ({ ...f, [key]: val })); setOpenDropdown(null); }}
                              style={{ display: "block", width: "100%", textAlign: "left", padding: "7px 14px", background: columnFilters[key] === val ? "var(--surface-hover, #dcfce7)" : "none", border: "none", cursor: "pointer", fontWeight: columnFilters[key] === val ? 600 : 400 }}
                            >
                              {val}
                            </button>
                          ))}
                        </div>
                      )}
                    </th>
                  ))}

                  <th>Contact</th>
                  <th>Email</th>

                  {[
                    { key: "ville", label: "Ville" },
                    { key: "village", label: "Village" },
                  ].map(({ key, label }) => (
                    <th key={key} style={{ position: "relative" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span>{label}</span>
                        <button
                          type="button"
                          style={{ background: "none", border: "none", padding: 0, cursor: "pointer", display: "flex", alignItems: "center" }}
                          onClick={(e) => { e.stopPropagation(); setOpenDropdown((prev) => (prev === key ? null : key)); }}
                        >
                          <ChevronDown size={13} strokeWidth={2} />
                          {columnFilters[key] && (
                            <span style={{ display: "inline-block", width: 7, height: 7, borderRadius: "50%", background: "var(--primary, #16a34a)", marginLeft: 3 }} />
                          )}
                        </button>
                      </div>
                      {openDropdown === key && (
                        <div style={{ position: "absolute", top: "100%", left: 0, zIndex: 50, background: "var(--surface, #fff)", border: "1px solid var(--border, #e2e8f0)", borderRadius: 8, boxShadow: "0 4px 16px rgba(0,0,0,0.10)", minWidth: 200, padding: "6px 0" }}>
                          <button type="button"
                            onClick={() => { setColumnFilters((f) => ({ ...f, [key]: "" })); setOpenDropdown(null); }}
                            style={{ display: "block", width: "100%", textAlign: "left", padding: "7px 14px", background: "none", border: "none", cursor: "pointer", fontStyle: "italic", color: "var(--muted-text, #94a3b8)" }}
                          >
                            Tous
                          </button>
                          {uniqueValues[key].map((val) => (
                            <button key={val} type="button"
                              onClick={() => { setColumnFilters((f) => ({ ...f, [key]: val })); setOpenDropdown(null); }}
                              style={{ display: "block", width: "100%", textAlign: "left", padding: "7px 14px", background: columnFilters[key] === val ? "var(--surface-hover, #dcfce7)" : "none", border: "none", cursor: "pointer", fontWeight: columnFilters[key] === val ? 600 : 400 }}
                            >
                              {val}
                            </button>
                          ))}
                        </div>
                      )}
                    </th>
                  ))}

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
