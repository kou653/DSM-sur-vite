import { useEffect, useState } from "react";
import JsonCrudSection from "../components/JsonCrudSection.jsx";
import { useAuth } from "../contexts/auth-context.js";
import { getProjetParcelles } from "../api/parcelles.js";
import {
  createPlant,
  getPlants,
  updatePlantStatus,
} from "../api/plants.js";

function normalizeParcelleOptions(payload) {
  const rawParcelles = Array.isArray(payload)
    ? payload
    : payload?.parcelles || payload?.data || [];

  return rawParcelles.map((parcelle) => ({
    id: Number(parcelle.id),
    name: parcelle.nom || `Parcelle ${parcelle.id}`,
  }));
}

function normalizePlants(payload) {
  const rawPlants = Array.isArray(payload)
    ? payload
    : payload?.plants || payload?.data || [];

  return rawPlants.map((plant) => ({
    id: Number(plant.id),
    code: plant.code || `PL${plant.id}`,
    name: plant.nom || `Plant ${plant.id}`,
    status: plant.status || null,
    parcelleName: plant.parcelle?.nom || null,
    especeName: plant.espece?.common_name || null,
    raw: plant,
  }));
}

function PlantsPage() {
  const { role, selectedProjectId } = useAuth();
  const [plants, setPlants] = useState([]);
  const [parcelles, setParcelles] = useState([]);
  const [selectedParcelleId, setSelectedParcelleId] = useState("");
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function fetchParcelles() {
      if (!selectedProjectId) {
        setParcelles([]);
        return;
      }

      try {
        const { data } = await getProjetParcelles(selectedProjectId);

        if (!isMounted) {
          return;
        }

        setParcelles(normalizeParcelleOptions(data));
      } catch {
        if (isMounted) {
          setParcelles([]);
        }
      }
    }

    fetchParcelles();

    return () => {
      isMounted = false;
    };
  }, [selectedProjectId]);

  useEffect(() => {
    async function fetchPlants() {
      if (!selectedProjectId) {
        setPlants([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      setErrorMessage("");

      const params = { project_id: selectedProjectId };

      if (selectedParcelleId) {
        params.parcelle_id = Number(selectedParcelleId);
      }

      try {
        const { data } = await getPlants(params);
        setPlants(normalizePlants(data));
      } catch (error) {
        setErrorMessage(
          error.response?.data?.message || "Impossible de charger les plants."
        );
      } finally {
        setLoading(false);
      }
    }

    fetchPlants();
  }, [selectedProjectId, selectedParcelleId]);

  return (
    <section className="panel panel-wide">
      <p className="eyebrow">Plants</p>
      <h2>Liste filtree par projet et parcelle</h2>

      <div className="filters-bar">
        <label className="filter-field">
          <span>Projet actif</span>
          <input value={selectedProjectId ?? ""} disabled readOnly />
        </label>

        <label className="filter-field">
          <span>Parcelle</span>
          <select
            value={selectedParcelleId}
            onChange={(event) => setSelectedParcelleId(event.target.value)}
          >
            <option value="">Toutes les parcelles</option>
            {parcelles.map((parcelle) => (
              <option key={parcelle.id} value={parcelle.id}>
                {parcelle.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <p>
        Filtres envoyes : `project_id={selectedProjectId ?? ""}`
        {selectedParcelleId ? `, parcelle_id=${selectedParcelleId}` : ""}
      </p>

      {errorMessage ? <p className="form-error">{errorMessage}</p> : null}
      {loading ? <p className="muted-text">Chargement des plants...</p> : null}

      <div className="list-grid">
        {plants.map((plant) => (
          <article key={plant.id} className="list-card">
            <p className="eyebrow">{plant.code}</p>
            <h3>{plant.name}</h3>
            <p>{plant.parcelleName ? `Parcelle : ${plant.parcelleName}` : "Parcelle non renseignee"}</p>
            <p>{plant.especeName ? `Espece : ${plant.especeName}` : "Espece non renseignee"}</p>
            <p>Statut : {plant.status || "Inconnu"}</p>
          </article>
        ))}
      </div>

      {!loading && !errorMessage && plants.length === 0 ? (
        <p className="muted-text">Aucun plant retourne avec ces filtres.</p>
      ) : null}

      <JsonCrudSection
        title="Plants"
        records={plants}
        loading={loading}
        errorMessage={errorMessage}
        onRefresh={() => {
          if (!selectedProjectId) {
            setPlants([]);
            setLoading(false);
            return Promise.resolve();
          }

          setLoading(true);
          setErrorMessage("");

          const params = { project_id: selectedProjectId };

          if (selectedParcelleId) {
            params.parcelle_id = Number(selectedParcelleId);
          }

          return getPlants(params)
            .then(({ data }) => {
              setPlants(normalizePlants(data));
            })
            .catch((error) => {
              setErrorMessage(
                error.response?.data?.message || "Impossible de charger les plants."
              );
              throw error;
            })
            .finally(() => {
              setLoading(false);
            });
        }}
        onCreate={createPlant}
        onUpdate={(id, payload) => updatePlantStatus(id, payload.status)}
        onDelete={null}
        createTemplate={{
          nom: "",
          code: "",
          parcelle_id: selectedParcelleId ? Number(selectedParcelleId) : "",
          espece_id: "",
          etat_sanitaire_id: "",
        }}
        canManage={["admin", "administrateur"].includes(role)}
        getRecordLabel={(record) => record.name}
      />
    </section>
  );
}

export default PlantsPage;
