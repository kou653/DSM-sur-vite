import { ArrowLeft, Camera, ImagePlus, Trash2, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { createParcelleEvolution, deleteEvolutionImage, getParcelleEvolution } from "../api/evolution.js";
import { getParcelle } from "../api/parcelles.js";
import { useAuth } from "../contexts/auth-context.js";

function EvolutionDetailsPage() {
  const { role, selectedProjectId } = useAuth();
  const { parcelleId } = useParams();

  const [parcelle, setParcelle] = useState(null);
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const [isUploadFormOpen, setIsUploadFormOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  
  const [description, setDescription] = useState("");
  const [dateObservation, setDateObservation] = useState(new Date().toISOString().slice(0, 10));
  const [selectedFile, setSelectedFile] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setErrorMessage("");

    try {
      const [parcelleRes, evoRes] = await Promise.all([
        getParcelle(parcelleId),
        getParcelleEvolution(parcelleId)
      ]);

      const pData = parcelleRes.data.parcelle || parcelleRes.data;
      setParcelle(pData);

      const evoData = Array.isArray(evoRes.data) ? evoRes.data : evoRes.data?.evolution || evoRes.data?.data || [];
      setImages(evoData);
      
    } catch (error) {
      setErrorMessage("Impossible de charger l'historique visuel de cette parcelle.");
    } finally {
      setLoading(false);
    }
  }, [parcelleId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!selectedFile) {
      setUploadError("Veuillez sélectionner une image.");
      return;
    }

    setUploading(true);
    setUploadError("");

    try {
      const formData = new FormData();
      formData.append("photo", selectedFile);
      formData.append("description", description);
      formData.append("date_observation", dateObservation);

      await createParcelleEvolution(parcelleId, formData);
      
      const evoRes = await getParcelleEvolution(parcelleId);
      const evoData = Array.isArray(evoRes.data) ? evoRes.data : evoRes.data?.evolution || evoRes.data?.data || [];
      setImages(evoData);

      setIsUploadFormOpen(false);
      setDescription("");
      setSelectedFile(null);
      setDateObservation(new Date().toISOString().slice(0, 10));
    } catch (error) {
      setUploadError(error.response?.data?.message || "Erreur lors du téléchargement de l'image.");
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteImage = async (imageId) => {
    if (!window.confirm("Voulez-vous vraiment supprimer cette photo ?")) return;

    try {
      await deleteEvolutionImage(imageId);
      setImages(images.filter(img => img.id !== imageId));
    } catch (error) {
      alert("Erreur lors de la suppression de l'image.");
    }
  };

  if (loading) {
    return <section className="users-page"><p className="muted-text">Chargement de l'historique visuel...</p></section>;
  }

  if (!parcelle || errorMessage) {
    return <section className="users-page"><p className="form-error">{errorMessage || "Parcelle introuvable"}</p></section>;
  }

  const canManage = ["administrateur", "agent terrain"].includes(role);

  return (
    <section className="users-page" style={{ paddingBottom: "4rem" }}>
      {/* Return link */}
      <div style={{ marginBottom: "1.5rem" }}>
         <Link to={`/dashboard/projet/${selectedProjectId}/evolution`} style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", textDecoration: "none", color: "var(--muted-text)", fontWeight: "500", fontSize: "0.95rem" }}>
           <ArrowLeft size={16} />
           Retour aux parcelles
         </Link>
      </div>

      <div className="users-toolbar">
        <div className="users-hero" style={{ margin: 0 }}>
          <div className="users-hero-icon" aria-hidden="true">
            <Camera size={22} strokeWidth={2.1} />
          </div>
          <div>
            <h1 style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>Evolution : <span style={{ color: "var(--primary)" }}>{parcelle.nom || `Parcelle #${parcelle.id}`}</span></h1>
            <p>Historique visuel de la parcelle <span style={{ background: "var(--surface-hover)", padding: "0.2rem 0.5rem", borderRadius: "10px", fontWeight: "600", color: "var(--text)" }}>{images.length} photos</span></p>
          </div>
        </div>

        <div className="users-toolbar-actions">
          {canManage && (
            <button type="button" className="dashboard-add-button" onClick={() => setIsUploadFormOpen(!isUploadFormOpen)}>
              {isUploadFormOpen ? <X size={16} strokeWidth={2.4} /> : <ImagePlus size={16} strokeWidth={2.4} />}
              {isUploadFormOpen ? "Fermer" : "Ajouter une photo"}
            </button>
          )}
        </div>
      </div>

      {isUploadFormOpen && (
        <section className="users-form-panel" style={{ marginBottom: "2rem", border: "1px solid var(--border)", boxShadow: "var(--shadow-sm)" }}>
           <div className="users-form-header">
             <h2>Ajouter une photo à l'historique</h2>
           </div>
           
           <form className="users-form" onSubmit={handleUploadSubmit}>
              {uploadError && <p className="form-error">{uploadError}</p>}
              
              <label className="filter-field">
                <span>Fichier Image (.jpg, .png)</span>
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={handleFileChange}
                  required
                />
              </label>

              <label className="filter-field">
                <span>Description de l'évolution (Texte court)</span>
                <textarea 
                  rows={3} 
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Ex: Pousse des plants après la saison des pluies..."
                  required
                />
              </label>
              
              <label className="filter-field">
                <span>Date d'observation</span>
                <input 
                  type="date" 
                  value={dateObservation}
                  onChange={(e) => setDateObservation(e.target.value)}
                  required
                />
              </label>
              
              <div className="crud-actions">
                <button type="submit" className="primary-action" disabled={uploading || !selectedFile}>
                  {uploading ? "Enregistrement en cours..." : "Télécharger la photo"}
                </button>
              </div>
           </form>
        </section>
      )}

      {images.length === 0 ? (
        <div style={{ textAlign: "center", padding: "4rem 2rem", background: "var(--surface)", borderRadius: "var(--radius-lg)", border: "1px dashed var(--border)" }}>
          <p className="muted-text">Aucune photo historique n'a encore été ajoutée pour cette parcelle.</p>
        </div>
      ) : (
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
          gap: "1.5rem"
        }}>
          {images.map(image => (
            <article key={image.id} style={{
              background: "var(--surface)", 
              borderRadius: "var(--radius-lg)", 
              overflow: "hidden",
              border: "1px solid var(--border)",
              boxShadow: "var(--shadow-sm)",
              display: "flex",
              flexDirection: "column"
            }}>
              <div style={{ 
                height: "220px", 
                width: "100%", 
                backgroundColor: "#f3f4f6", 
                position: "relative" 
              }}>
                <img 
                  src={image.url} 
                  alt={image.description || "Photo d'évolution"} 
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  onError={(e) => { e.target.src = "https://via.placeholder.com/400x300?text=Image+Introuvable" }}
                />
                {canManage && (
                  <button 
                    onClick={() => handleDeleteImage(image.id)}
                    style={{ position: "absolute", top: "0.5rem", right: "0.5rem", background: "rgba(0,0,0,0.6)", color: "white", padding: "0.5rem", borderRadius: "50%", border: "none", cursor: "pointer" }}
                    title="Supprimer cette photo"
                  >
                     <Trash2 size={16} />
                  </button>
                )}
              </div>
              <div style={{ padding: "1.25rem", flexGrow: 1, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                 <p style={{ margin: "0 0 1rem 0", lineHeight: "1.5", color: "var(--text)" }}>{image.description}</p>
                 <span style={{ fontSize: "0.85rem", color: "var(--muted-text)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                   <span>Ajouté le {new Date(image.date).toLocaleDateString()}</span>
                   {image.author && <strong>{image.author.nom}</strong>}
                 </span>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

export default EvolutionDetailsPage;
