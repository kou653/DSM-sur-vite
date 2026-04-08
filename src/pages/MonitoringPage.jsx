import { useEffect, useMemo, useState } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useAuth } from "../contexts/auth-context.js";
import { getProjetParcelles } from "../api/parcelles.js";
import { getParcellePlants } from "../api/plants.js";
import { getEspeces } from "../api/referentiels.js";

const MONTH_LABELS = [
  "Jan",
  "Fev",
  "Mar",
  "Avr",
  "Mai",
  "Juin",
  "Juil",
  "Aou",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

function normalizeParcelles(payload) {
  const rawParcelles = Array.isArray(payload)
    ? payload
    : payload?.parcelles || payload?.data || [];

  return rawParcelles.map((parcelle) => ({
    id: Number(parcelle.id),
    nom: parcelle.nom || `Parcelle ${parcelle.id}`,
  }));
}

function normalizeEspeces(payload) {
  const rawEspeces = Array.isArray(payload)
    ? payload
    : payload?.especes || payload?.data || [];

  return rawEspeces.map((espece) => ({
    id: Number(espece.id),
    nom: espece.nom_commun || espece.nom_scientifique || `Espece ${espece.id}`,
  }));
}

function normalizePlants(payload) {
  const rawPlants = Array.isArray(payload)
    ? payload
    : payload?.plants || payload?.data || [];

  return rawPlants.map((plant) => ({
    id: Number(plant.id),
    datePlantation: plant.date_plantation || null,
    status: plant.status || null,
    especeId: Number(plant.espece_id ?? plant.espece?.id ?? 0) || null,
    especeNom:
      plant.espece?.nom_commun ||
      plant.espece?.nom_scientifique ||
      null,
  }));
}

function buildMonthlyEvolution(plants) {
  const monthlyMap = new Map();

  plants.forEach((plant) => {
    if (!plant.datePlantation) {
      return;
    }

    const date = new Date(plant.datePlantation);

    if (Number.isNaN(date.getTime())) {
      return;
    }

    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    const existingValue = monthlyMap.get(monthKey) ?? {
      key: monthKey,
      label: `${MONTH_LABELS[date.getMonth()]} ${date.getFullYear()}`,
      plantsMiseEnTerre: 0,
      plantsVivants: 0,
    };

    existingValue.plantsMiseEnTerre += 1;

    if (plant.status === "vivant") {
      existingValue.plantsVivants += 1;
    }

    monthlyMap.set(monthKey, existingValue);
  });

  return Array.from(monthlyMap.values()).sort((left, right) =>
    left.key.localeCompare(right.key)
  );
}

function MonitoringPage() {
  const { selectedProjectId } = useAuth();
  const [parcelles, setParcelles] = useState([]);
  const [especes, setEspeces] = useState([]);
  const [plants, setPlants] = useState([]);
  const [selectedParcelleId, setSelectedParcelleId] = useState("");
  const [selectedEspeceId, setSelectedEspeceId] = useState("");
  const [loadingFilters, setLoadingFilters] = useState(true);
  const [loadingPlants, setLoadingPlants] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function fetchFilters() {
      if (!selectedProjectId) {
        setParcelles([]);
        setEspeces([]);
        setLoadingFilters(false);
        return;
      }

      setLoadingFilters(true);
      setErrorMessage("");

      try {
        const [parcellesResponse, especesResponse] = await Promise.all([
          getProjetParcelles(selectedProjectId),
          getEspeces(),
        ]);

        if (!isMounted) {
          return;
        }

        setParcelles(normalizeParcelles(parcellesResponse.data));
        setEspeces(normalizeEspeces(especesResponse.data));
      } catch (error) {
        if (isMounted) {
          setErrorMessage("Impossible de charger les filtres du monitoring.");
        }
      } finally {
        if (isMounted) {
          setLoadingFilters(false);
        }
      }
    }

    fetchFilters();

    return () => {
      isMounted = false;
    };
  }, [selectedProjectId]);

  useEffect(() => {
    let isMounted = true;

    async function fetchPlants() {
      if (!selectedParcelleId) {
        setPlants([]);
        setSelectedEspeceId("");
        return;
      }

      setLoadingPlants(true);
      setErrorMessage("");
      setSelectedEspeceId("");

      try {
        const { data } = await getParcellePlants(selectedParcelleId);

        if (!isMounted) {
          return;
        }

        setPlants(normalizePlants(data));
      } catch (error) {
        if (isMounted) {
          setPlants([]);
          setErrorMessage("Impossible de charger les donnees de la parcelle selectionnee.");
        }
      } finally {
        if (isMounted) {
          setLoadingPlants(false);
        }
      }
    }

    fetchPlants();

    return () => {
      isMounted = false;
    };
  }, [selectedParcelleId]);

  const availableEspeces = useMemo(() => {
    if (!selectedParcelleId) {
      return [];
    }

    const ids = new Set(plants.map((plant) => plant.especeId).filter(Boolean));

    return especes
      .filter((espece) => ids.has(espece.id))
      .sort((left, right) => left.nom.localeCompare(right.nom));
  }, [especes, plants, selectedParcelleId]);

  const filteredPlants = useMemo(() => {
    if (!selectedEspeceId) {
      return plants;
    }

    const numericEspeceId = Number(selectedEspeceId);
    return plants.filter((plant) => plant.especeId === numericEspeceId);
  }, [plants, selectedEspeceId]);

  const parcelleStats = useMemo(() => {
    const plantsMiseEnTerre = filteredPlants.length;
    const plantsVivants = filteredPlants.filter((plant) => plant.status === "vivant").length;
    const tauxSuivi =
      plantsMiseEnTerre > 0
        ? Math.round((plantsVivants / plantsMiseEnTerre) * 1000) / 10
        : 0;

    return {
      plantsMiseEnTerre,
      plantsVivants,
      tauxSuivi,
    };
  }, [filteredPlants]);

  const monthlyEvolution = useMemo(
    () => buildMonthlyEvolution(filteredPlants),
    [filteredPlants]
  );

  return (
    <section className="monitoring-page">
      <header className="monitoring-header">
        <h1>Monitoring</h1>
        <p>Suivi detaille de l'evolution mensuelle par especes et parcelle.</p>
      </header>

      <section className="monitoring-card">
        <div className="monitoring-card-heading">
          <h2>Selection des filtres</h2>
        </div>

        <div className="monitoring-filter-grid">
          <label className="filter-field">
            <span>Parcelle</span>
            <select
              value={selectedParcelleId}
              onChange={(event) => setSelectedParcelleId(event.target.value)}
              disabled={loadingFilters}
            >
              <option value="">Selectionner une parcelle</option>
              {parcelles.map((parcelle) => (
                <option key={parcelle.id} value={parcelle.id}>
                  {parcelle.nom}
                </option>
              ))}
            </select>
          </label>

          <label className="filter-field">
            <span>Espece</span>
            <select
              value={selectedEspeceId}
              onChange={(event) => setSelectedEspeceId(event.target.value)}
              disabled={!selectedParcelleId || loadingPlants}
            >
              <option value="">Toutes les especes</option>
              {availableEspeces.map((espece) => (
                <option key={espece.id} value={espece.id}>
                  {espece.nom}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      {errorMessage ? <p className="form-error">{errorMessage}</p> : null}

      {!selectedParcelleId ? (
        <section className="monitoring-card monitoring-empty-state">
          <p className="muted-text">
            Selectionnez une parcelle pour afficher les indicateurs et la courbe d'evolution mensuelle.
          </p>
        </section>
      ) : null}

      {selectedParcelleId ? (
        <>
          <section className="monitoring-stats-grid">
            <article className="monitoring-stat-card">
              <p>Plants mis en terre</p>
              <h3>{loadingPlants ? "--" : parcelleStats.plantsMiseEnTerre}</h3>
            </article>

            <article className="monitoring-stat-card">
              <p>Plants vivants</p>
              <h3>{loadingPlants ? "--" : parcelleStats.plantsVivants}</h3>
            </article>

            <article className="monitoring-stat-card">
              <p>Taux de suivi</p>
              <h3>{loadingPlants ? "--" : `${parcelleStats.tauxSuivi}%`}</h3>
            </article>
          </section>

          <section className="monitoring-card monitoring-chart-card">
            <div className="monitoring-card-heading">
              <h2>Evolution mensuelle des especes</h2>
              <p>
                Le graphique montre l'evolution mensuelle des plants mis en terre et vivants.
              </p>
            </div>

            {loadingPlants ? (
              <p className="muted-text">Chargement des donnees de la parcelle...</p>
            ) : monthlyEvolution.length === 0 ? (
              <p className="muted-text">
                Aucune donnee mensuelle n'est disponible pour les filtres selectionnes.
              </p>
            ) : (
              <div className="monitoring-chart-shell">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={monthlyEvolution}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#d9e6db" />
                    <XAxis dataKey="label" stroke="#6f8272" />
                    <YAxis allowDecimals={false} stroke="#6f8272" />
                    <Tooltip
                      contentStyle={{
                        borderRadius: "14px",
                        border: "1px solid #d8e7da",
                        boxShadow: "0 12px 28px rgba(52, 88, 62, 0.1)",
                      }}
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="plantsMiseEnTerre"
                      name="Plants mis en terre"
                      stroke="#1f9953"
                      strokeWidth={3}
                      dot={{ r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="plantsVivants"
                      name="Plants vivants"
                      stroke="#f59e0b"
                      strokeWidth={3}
                      dot={{ r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </section>
        </>
      ) : null}
    </section>
  );
}

export default MonitoringPage;
