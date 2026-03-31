import { useEffect, useState } from "react";
import JsonCrudSection from "../components/JsonCrudSection.jsx";
import { getCooperatives } from "../api/referentiels.js";

function normalizeCooperatives(payload) {
  const rawCooperatives = Array.isArray(payload)
    ? payload
    : payload?.cooperatives || payload?.data || [];

  return rawCooperatives.map((cooperative) => ({
    id: Number(cooperative.id),
    name: cooperative.name || `Cooperative ${cooperative.id}`,
    locality: cooperative.city || null,
    raw: cooperative,
  }));
}

function CooperativesPage() {
  const [cooperatives, setCooperatives] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  async function fetchCooperatives() {
    setLoading(true);
    setErrorMessage("");

    try {
      const { data } = await getCooperatives();
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
  }, []);

  return (
    <section className="panel panel-wide">
      <p className="eyebrow">Cooperatives</p>
      <h2>Gestion des cooperatives</h2>

      <div className="list-grid">
        {cooperatives.map((cooperative) => (
          <article key={cooperative.id} className="list-card">
            <p className="eyebrow">#{cooperative.id}</p>
            <h3>{cooperative.name}</h3>
            <p>
              {cooperative.locality
                ? `Localite : ${cooperative.locality}`
                : "Localite non renseignee"}
            </p>
          </article>
        ))}
      </div>

      <JsonCrudSection
        title="Cooperatives"
        records={cooperatives}
        loading={loading}
        errorMessage={errorMessage}
        onRefresh={fetchCooperatives}
        onCreate={null}
        onUpdate={null}
        onDelete={null}
        canManage={false}
        getRecordLabel={(record) => record.name}
      />
    </section>
  );
}

export default CooperativesPage;
