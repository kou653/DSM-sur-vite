import { useEffect, useState } from "react";
import JsonCrudSection from "../components/JsonCrudSection.jsx";
import { useAuth } from "../contexts/auth-context.js";
import { getProjetParcelles } from "../api/parcelles.js";
import {
  createPlant,
  getParcellePlants,
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

function normalizePlants(payload, selectedParcelleName) {
  const rawPlants = Array.isArray(payload)
    ? payload
    : payload?.plants || payload?.data || [];

  return rawPlants.map((plant) => ({
    id: Number(plant.id),
    code: `PL${plant.id}`,
    name: `Plant ${plant.id}`,
    status: plant.status || null,
    parcelleName: plant.parcelle?.nom || selectedParcelleName || null,
    especeName: plant.espece?.nom_commun || null,
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
        setSelectedParcelleId("");
        return;
      }

      try {
        const { data } = await getProjetParcelles(selectedProjectId);

        if (!isMounted) {
          return;
        }

        const nextParcelles = normalizeParcelleOptions(data);
        setParcelles(nextParcelles);
        setSelectedParcelleId((currentValue) => {
          if (currentValue && nextParcelles.some((parcelle) => String(parcelle.id) === currentValue)) {
            return currentValue;
          }

          return nextParcelles[0] ? String(nextParcelles[0].id) : "";
        });
      } catch {
        if (isMounted) {
          setParcelles([]);
          setSelectedParcelleId("");
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
      if (!selectedParcelleId) {
        setPlants([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      setErrorMessage("");

      try {
        const { data } = await getParcellePlants(selectedParcelleId);
        const selectedParcelle = parcelles.find(
          (parcelle) => String(parcelle.id) === selectedParcelleId
        );
        setPlants(normalizePlants(data, selectedParcelle?.name ?? null));
      } catch (error) {
        setErrorMessage(
          error.response?.data?.message || "Impossible de charger les plants."
        );
      } finally {
        setLoading(false);
      }
    }

    fetchPlants();
  }, [parcelles, selectedParcelleId]);

  const refreshPlants = () => {
    if (!selectedParcelleId) {
      setPlants([]);
      setLoading(false);
      return Promise.resolve();
    }

    setLoading(true);
    setErrorMessage("");

    return getParcellePlants(selectedParcelleId)
      .then(({ data }) => {
        const selectedParcelle = parcelles.find(
          (parcelle) => String(parcelle.id) === selectedParcelleId
        );
        setPlants(normalizePlants(data, selectedParcelle?.name ?? null));
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
  };

  return (
    <section className="panel panel-wide">
      <p className="eyebrow">Plants</p>
      <h2>Liste des plants par parcelle</h2>

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
            <option value="">Selectionner une parcelle</option>
            {parcelles.map((parcelle) => (
              <option key={parcelle.id} value={parcelle.id}>
                {parcelle.name}
              </option>
            ))}
          </select>
        </label>
      </div>

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
        <p className="muted-text">Aucun plant retourne pour cette parcelle.</p>
      ) : null}

      <JsonCrudSection
        title="Plants"
        records={plants}
        loading={loading}
        errorMessage={errorMessage}
        onRefresh={refreshPlants}
        onCreate={createPlant}
        onUpdate={(id, payload) => updatePlantStatus(id, payload.status)}
        onDelete={null}
        createTemplate={{
          espece_id: "",
          parcelle_id: selectedParcelleId ? Number(selectedParcelleId) : "",
          date_plantation: "",
          status: "vivant",
          lat: "",
          lng: "",
        }}
        canManage={["administrateur", "agent terrain"].includes(role)}
        getRecordLabel={(record) => record.name}
      />
    </section>
  );
}

export default PlantsPage;
