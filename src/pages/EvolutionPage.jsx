import { useEffect, useState } from "react";
import {
  createParcelleEvolution,
  deleteEvolutionImage,
  getParcelleEvolution,
} from "../api/evolution.js";
import { getProjetParcelles } from "../api/parcelles.js";
import { useAuth } from "../contexts/auth-context.js";

function normalizeParcelles(payload) {
  const rawParcelles = Array.isArray(payload)
    ? payload
    : payload?.parcelles || payload?.data || [];

  return rawParcelles.map((parcelle) => ({
    id: Number(parcelle.id),
    name: parcelle.nom || `Parcelle ${parcelle.id}`,
  }));
}

function normalizeEvolution(payload) {
  const rawEvolution = Array.isArray(payload)
    ? payload
    : payload?.evolution || payload?.data || [];

  return rawEvolution.map((item) => ({
    id: Number(item.id),
    url: item.url || "",
    description: item.description || "",
    date: item.date || null,
  }));
}

function EvolutionPage() {
  const { role, selectedProjectId } = useAuth();
  const [parcelles, setParcelles] = useState([]);
  const [selectedParcelleId, setSelectedParcelleId] = useState("");
  const [images, setImages] = useState([]);
  const [description, setDescription] = useState("");
  const [photoFile, setPhotoFile] = useState(null);
  const [loadingParcelles, setLoadingParcelles] = useState(true);
  const [loadingImages, setLoadingImages] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function fetchParcelles() {
      if (!selectedProjectId) {
        setParcelles([]);
        setSelectedParcelleId("");
        setLoadingParcelles(false);
        return;
      }

      setLoadingParcelles(true);

      try {
        const { data } = await getProjetParcelles(selectedProjectId);
        const nextParcelles = normalizeParcelles(data);

        if (!isMounted) return;

        setParcelles(nextParcelles);
        setSelectedParcelleId((currentValue) => {
          if (
            currentValue &&
            nextParcelles.some((parcelle) => String(parcelle.id) === currentValue)
          ) {
            return currentValue;
          }

          return nextParcelles[0] ? String(nextParcelles[0].id) : "";
        });
      } catch (error) {
        if (isMounted) {
          setErrorMessage(
            error.response?.data?.message ||
              "Impossible de charger les parcelles du projet."
          );
        }
      } finally {
        if (isMounted) {
          setLoadingParcelles(false);
        }
      }
    }

    fetchParcelles();

    return () => {
      isMounted = false;
    };
  }, [selectedProjectId]);

  useEffect(() => {
    let isMounted = true;

    async function fetchEvolution() {
      if (!selectedParcelleId) {
        setImages([]);
        return;
      }

      setLoadingImages(true);
      setErrorMessage("");

      try {
        const { data } = await getParcelleEvolution(selectedParcelleId);
        if (isMounted) {
          setImages(normalizeEvolution(data));
        }
      } catch (error) {
        if (isMounted) {
          setErrorMessage(
            error.response?.data?.message ||
              "Impossible de charger les photos d'evolution."
          );
        }
      } finally {
        if (isMounted) {
          setLoadingImages(false);
        }
      }
    }

    fetchEvolution();

    return () => {
      isMounted = false;
    };
  }, [selectedParcelleId]);

  async function handleSubmit(event) {
    event.preventDefault();

    if (!selectedParcelleId || !photoFile || !description.trim()) {
      setErrorMessage("Selectionnez une parcelle, une photo et une description.");
      return;
    }

    setSubmitting(true);
    setErrorMessage("");
    setSuccessMessage("");

    const formData = new FormData();
    formData.append("photo", photoFile);
    formData.append("description", description.trim());

    try {
      await createParcelleEvolution(selectedParcelleId, formData);
      const { data } = await getParcelleEvolution(selectedParcelleId);

      setImages(normalizeEvolution(data));
      setDescription("");
      setPhotoFile(null);
      setSuccessMessage("Photo d'evolution ajoutee avec succes.");

      const fileInput = document.getElementById("evolution-photo-input");
      if (fileInput) {
        fileInput.value = "";
      }
    } catch (error) {
      setErrorMessage(
        error.response?.data?.message || "Impossible d'ajouter la photo d'evolution."
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(imageId) {
    setErrorMessage("");
    setSuccessMessage("");

    try {
      await deleteEvolutionImage(imageId);
      setImages((currentImages) =>
        currentImages.filter((image) => image.id !== imageId)
      );
      setSuccessMessage("Photo d'evolution supprimee avec succes.");
    } catch (error) {
      setErrorMessage(
        error.response?.data?.message ||
          "Impossible de supprimer la photo d'evolution."
      );
    }
  }

  const canUpload = role !== "commanditaire";
  const canDelete = role === "administrateur";

  return (
    <section className="panel panel-wide">
      <p className="eyebrow">Evolution</p>
      <h2>Suivi photo des parcelles</h2>

      <div className="filters-bar">
        <label className="filter-field">
          <span>Parcelle</span>
          <select
            value={selectedParcelleId}
            onChange={(event) => setSelectedParcelleId(event.target.value)}
            disabled={loadingParcelles || parcelles.length === 0}
          >
            {parcelles.length === 0 ? (
              <option value="">Aucune parcelle disponible</option>
            ) : null}
            {parcelles.map((parcelle) => (
              <option key={parcelle.id} value={parcelle.id}>
                {parcelle.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      {errorMessage ? <p className="form-error">{errorMessage}</p> : null}
      {successMessage ? <p className="evolution-success">{successMessage}</p> : null}

      {canUpload ? (
        <form className="evolution-form" onSubmit={handleSubmit}>
          <label className="filter-field">
            <span>Description</span>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Exemple: croissance observee, reprise vegetative, etat sanitaire..."
              rows={4}
            />
          </label>

          <label className="filter-field">
            <span>Photo</span>
            <input
              id="evolution-photo-input"
              type="file"
              accept="image/*"
              onChange={(event) => setPhotoFile(event.target.files?.[0] || null)}
            />
          </label>

          <button
            type="submit"
            className="primary-action"
            disabled={submitting || !selectedParcelleId}
          >
            {submitting ? "Ajout en cours..." : "Ajouter une photo"}
          </button>
        </form>
      ) : (
        <p className="muted-text">
          Votre profil peut consulter les photos, mais pas en ajouter.
        </p>
      )}

      {loadingImages ? (
        <p className="muted-text">Chargement des photos d'evolution...</p>
      ) : null}

      {!loadingImages && images.length === 0 ? (
        <p className="muted-text">
          Aucune photo d'evolution n'est encore disponible pour cette parcelle.
        </p>
      ) : null}

      {images.length > 0 ? (
        <div className="evolution-grid">
          {images.map((image) => (
            <article key={image.id} className="evolution-card">
              <img
                src={image.url}
                alt={image.description || "Photo d'evolution"}
                className="evolution-image"
              />
              <div className="evolution-card-body">
                <p>{image.description}</p>
                <span>
                  {image.date
                    ? new Date(image.date).toLocaleDateString("fr-FR")
                    : "Date non disponible"}
                </span>
                {canDelete ? (
                  <button
                    type="button"
                    className="danger-action"
                    onClick={() => handleDelete(image.id)}
                  >
                    Supprimer
                  </button>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      ) : null}
    </section>
  );
}

export default EvolutionPage;
