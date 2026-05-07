import { FileSpreadsheet, Leaf, Pencil, Plus, Search, Trash2, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import ConfirmDialog from "../components/ConfirmDialog.jsx";
import TableFilterDropdown from "../components/TableFilterDropdown.jsx";
import {
  bulkCreateEspeces,
  createEspece,
  deleteEspece,
  getEspeces,
  updateEspece,
} from "../api/referentiels.js";
import { useAuth } from "../contexts/auth-context.js";

async function loadSpreadsheetTools() {
  return import("xlsx");
}

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
  const fileInputRef = useRef(null);
  const [especes, setEspeces] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [columnFilters, setColumnFilters] = useState({ nom_commun: "", nom_scientifique: "" });
  const [openDropdown, setOpenDropdown] = useState(null);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [actionError, setActionError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingEspece, setEditingEspece] = useState(null);
  const [formState, setFormState] = useState(buildInitialFormState());
  const [deleteTarget, setDeleteTarget] = useState(null);

  async function fetchEspeces() {
    setLoading(true);
    setErrorMessage("");

    try {
      const { data } = await getEspeces();
      setEspeces(normalizeEspeces(data));
    } catch {
      setErrorMessage("Impossible de charger les especes.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchEspeces();
  }, []);

  useEffect(() => {
    if (!openDropdown) return;
    const close = () => setOpenDropdown(null);
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [openDropdown]);

  const filteredEspeces = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return especes.filter((espece) => {
      const matchesSearch =
        !normalizedSearch ||
        [espece.name, espece.scientificName].join(" ").toLowerCase().includes(normalizedSearch);

      const matchesNomCommun =
        !columnFilters.nom_commun || espece.name === columnFilters.nom_commun;

      const matchesNomScientifique =
        !columnFilters.nom_scientifique || espece.scientificName === columnFilters.nom_scientifique;

      return matchesSearch && matchesNomCommun && matchesNomScientifique;
    });
  }, [especes, searchTerm, columnFilters]);

  const uniqueValues = useMemo(() => ({
    nom_commun: [...new Set(especes.map((espece) => espece.name))].sort(),
    nom_scientifique: [...new Set(especes.map((espece) => espece.scientificName))].sort(),
  }), [especes]);

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

  async function handleDelete() {
    if (!deleteTarget) {
      return;
    }

    setSubmitting(true);
    setActionError("");
    setSuccessMessage("");

    try {
      await deleteEspece(deleteTarget.id);
      setSuccessMessage("Espece supprimee avec succes.");
      await fetchEspeces();
      setDeleteTarget(null);
    } catch (error) {
      setActionError(
        error.response?.data?.message || "Suppression impossible pour cette espece."
      );
    } finally {
      setSubmitting(false);
    }
  }

  const handleExcelImport = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setImporting(true);
    setActionError("");
    setSuccessMessage("");

    const reader = new FileReader();
    reader.onload = async (loadEvent) => {
      try {
        const XLSX = await loadSpreadsheetTools();
        const data = new Uint8Array(loadEvent.target.result);
        const workbook = XLSX.read(data, { type: "array" });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        const payloadEspeces = jsonData
          .map((row) => {
            const nomCommun = row["Nom Commun"] || row.nom_commun || row.Nom || row.nom;
            const nomScientifique =
              row["Nom Scientifique"] || row.nom_scientifique || row.Scientifique || row.scientifique;

            if (!nomCommun || !nomScientifique) return null;

            return {
              nom_commun: String(nomCommun).trim(),
              nom_scientifique: String(nomScientifique).trim(),
            };
          })
          .filter(Boolean);

        if (payloadEspeces.length === 0) {
          throw new Error("Aucune donnee valide trouvee. Assurez-vous d'avoir les colonnes 'Nom Commun' et 'Nom Scientifique'.");
        }

        const response = await bulkCreateEspeces({ especes: payloadEspeces });
        setSuccessMessage(response.data.message || "Importation reussie.");
        await fetchEspeces();
      } catch (error) {
        setActionError(error.message || "Erreur lors de la lecture du fichier Excel.");
      } finally {
        setImporting(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    };

    reader.readAsArrayBuffer(file);
  };

  return (
    <section className="users-page">
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Supprimer cette espece ?"
        message={
          deleteTarget
            ? `Cette action supprimera definitivement l'espece ${deleteTarget.name}.`
            : ""
        }
        confirmLabel="Supprimer"
        loading={submitting}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
      />

      <div className="users-toolbar">
        <div className="users-hero">
          <div className="users-hero-icon" aria-hidden="true">
            <Leaf size={22} strokeWidth={2.1} />
          </div>
          <div>
            <h1>Especes</h1>
            <p>Catalogue des especes vegetales.</p>
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

          {role === "administrateur" || role === "agent terrain" ? (
            <>
              <input
                type="file"
                ref={fileInputRef}
                style={{ display: "none" }}
                accept=".xlsx, .xls, .csv"
                onChange={handleExcelImport}
              />
              <button
                type="button"
                className="secondary-action"
                onClick={() => fileInputRef.current?.click()}
                disabled={importing}
                style={{ display: "flex", alignItems: "center", gap: "8px" }}
              >
                <FileSpreadsheet size={16} strokeWidth={2} />
                {importing ? "Importation..." : "Importer Excel"}
              </button>

              <button type="button" className="dashboard-add-button" onClick={openCreateForm}>
                <Plus size={14} strokeWidth={2.4} />
                Ajouter
              </button>
            </>
          ) : null}
        </div>
      </div>

      {errorMessage ? <p className="form-error">{errorMessage}</p> : null}
      {actionError ? <p className="form-error">{actionError}</p> : null}
      {successMessage ? <p className="evolution-success">{successMessage}</p> : null}

      <div className="cooperatives-summary-grid">
        <article className="cooperatives-summary-card">
          <p>Total especes referencees</p>
          <h2>{especes.length}</h2>
        </article>
      </div>

      {isFormOpen ? (
        <section className="users-form-panel">
          <div className="users-form-header">
            <div>
              <p className="eyebrow">{editingEspece ? "Modifier" : "Creation"}</p>
              <h2>
                {editingEspece ? "Modifier une espece" : "Enregistrer une espece"}
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
          <h2>Liste des especes</h2>
        </div>

        {loading ? <p className="muted-text">Chargement des especes...</p> : null}

        {!loading && filteredEspeces.length === 0 ? (
          <p className="muted-text">Aucune espece ne correspond a la recherche.</p>
        ) : null}

        {!loading && filteredEspeces.length > 0 ? (
          <div className="users-table-wrapper">
            <table className="users-table">
              <thead>
                <tr>
                  {[
                    { key: "nom_commun", label: "Nom commun" },
                    { key: "nom_scientifique", label: "Nom scientifique" },
                  ].map(({ key, label }) => (
                    <TableFilterDropdown
                      key={key}
                      filterKey={key}
                      label={label}
                      selectedValue={columnFilters[key]}
                      values={uniqueValues[key]}
                      openDropdown={openDropdown}
                      setOpenDropdown={setOpenDropdown}
                      onChange={(value) => setColumnFilters((current) => ({ ...current, [key]: value }))}
                    />
                  ))}
                  {role === "administrateur" || role === "agent terrain" ? <th>Actions</th> : null}
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
                    {role === "administrateur" || role === "agent terrain" ? (
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
                          {role === "administrateur" ? (
                            <button
                              type="button"
                              className="danger-action users-icon-button"
                              onClick={() => setDeleteTarget(espece)}
                              disabled={submitting}
                            >
                              <Trash2 size={14} strokeWidth={2} />
                            </button>
                          ) : null}
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
