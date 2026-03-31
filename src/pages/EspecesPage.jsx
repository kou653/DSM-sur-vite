import { useEffect, useState } from "react";
import JsonCrudSection from "../components/JsonCrudSection.jsx";
import { getEspeces } from "../api/referentiels.js";

function normalizeEspeces(payload) {
  const rawEspeces = Array.isArray(payload)
    ? payload
    : payload?.especes || payload?.data || [];

  return rawEspeces.map((espece) => ({
    id: Number(espece.id),
    name: espece.common_name || `Espece ${espece.id}`,
    scientificName: espece.scientific_name || null,
    raw: espece,
  }));
}

function EspecesPage() {
  const [especes, setEspeces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  async function fetchEspeces() {
    setLoading(true);
    setErrorMessage("");

    try {
      const { data } = await getEspeces();
      setEspeces(normalizeEspeces(data));
    } catch (error) {
      setErrorMessage(
        error.response?.data?.message || "Impossible de charger les especes."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchEspeces();
  }, []);

  return (
    <section className="panel panel-wide">
      <p className="eyebrow">Especes</p>
      <h2>Catalogue des especes</h2>

      <div className="list-grid">
        {especes.map((espece) => (
          <article key={espece.id} className="list-card">
            <p className="eyebrow">#{espece.id}</p>
            <h3>{espece.name}</h3>
            <p>
              {espece.scientificName
                ? `Nom scientifique : ${espece.scientificName}`
                : "Nom scientifique non renseigne"}
            </p>
          </article>
        ))}
      </div>

      <JsonCrudSection
        title="Especes"
        records={especes}
        loading={loading}
        errorMessage={errorMessage}
        onRefresh={fetchEspeces}
        onCreate={null}
        onUpdate={null}
        onDelete={null}
        canManage={false}
        getRecordLabel={(record) => record.name}
      />
    </section>
  );
}

export default EspecesPage;
