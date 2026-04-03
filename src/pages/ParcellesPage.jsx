import { useCallback, useEffect, useState } from "react";
import JsonCrudSection from "../components/JsonCrudSection.jsx";
import { useAuth } from "../contexts/auth-context.js";
import {
  createProjetParcelle,
  deleteParcelle,
  getProjetParcelles,
  updateParcelle,
} from "../api/parcelles.js";

function normalizeParcelles(payload) {
  const rawParcelles = Array.isArray(payload)
    ? payload
    : payload?.parcelles || payload?.data || [];

  return rawParcelles.map((parcelle) => ({
    id: Number(parcelle.id),
    code: `PAR${parcelle.id}`,
    name: parcelle.nom || `Parcelle ${parcelle.id}`,
    area: parcelle.superficie || null,
    objectif: parcelle.objectif ?? null,
    city: parcelle.ville || null,
    cooperativeName: parcelle.cooperative?.nom || null,
    raw: parcelle,
  }));
}

function ParcellesPage() {
  const { role, selectedProjectId } = useAuth();
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
      const { data } = await getProjetParcelles(selectedProjectId);
      setParcelles(normalizeParcelles(data));
    } catch (error) {
      setErrorMessage(
        error.response?.data?.message || "Impossible de charger les parcelles."
      );
    } finally {
      setLoading(false);
    }
  }, [selectedProjectId]);

  useEffect(() => {
    fetchParcelles();
  }, [fetchParcelles]);

  return (
    <section className="panel panel-wide">
      <p className="eyebrow">Parcelles</p>
      <h2>Liste du projet actif</h2>

      {errorMessage ? <p className="form-error">{errorMessage}</p> : null}
      {loading ? <p className="muted-text">Chargement des parcelles...</p> : null}

      <div className="list-grid">
        {parcelles.map((parcelle) => (
          <article key={parcelle.id} className="list-card">
            <p className="eyebrow">{parcelle.code}</p>
            <h3>{parcelle.name}</h3>
            <p>{parcelle.city ? `Ville : ${parcelle.city}` : "Ville non renseignee"}</p>
            <p>
              {parcelle.cooperativeName
                ? `Cooperative : ${parcelle.cooperativeName}`
                : "Cooperative non renseignee"}
            </p>
            <p>
              {parcelle.area ? `Superficie : ${parcelle.area}` : "Superficie non renseignee"}
            </p>
          </article>
        ))}
      </div>

      {!loading && !errorMessage && parcelles.length === 0 ? (
        <p className="muted-text">Aucune parcelle retournee pour ce projet.</p>
      ) : null}

      <JsonCrudSection
        title="Parcelles"
        records={parcelles}
        loading={loading}
        errorMessage={errorMessage}
        onRefresh={fetchParcelles}
        onCreate={(payload) => createProjetParcelle(selectedProjectId, payload)}
        onUpdate={updateParcelle}
        onDelete={deleteParcelle}
        createTemplate={{
          nom: "",
          ville: "",
          cooperative_id: "",
          superficie: "",
          lat: "",
          lng: "",
          objectif: "",
        }}
        canManage={["administrateur", "agent terrain"].includes(role)}
        getRecordLabel={(record) => `${record.code} - ${record.name}`}
      />
    </section>
  );
}

export default ParcellesPage;
