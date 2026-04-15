// import { useEffect, useMemo, useState } from "react";
// import { Link, useParams } from "react-router-dom";
// import { getParcellePlants } from "../api/plants.js";

// function normalizePlants(payload) {
//   const rawPlants = Array.isArray(payload)
//     ? payload
//     : payload?.plants || payload?.data || [];

//   return rawPlants.map((plant) => ({
//     id: Number(plant.id),
//     status: plant.status || null,
//     especeNom:
//       plant.espece?.nom_commun ||
//       plant.espece?.nom_scientifique ||
//       "Espece inconnue",
//     documentation: plant.documentation || "",
//   }));
// }

// function buildSpeciesGroups(plants) {
//   const bySpecies = new Map();

//   plants.forEach((plant) => {
//     const documentation = String(plant.documentation || "").trim();
//     if (!documentation) return;

//     const key = String(plant.especeNom || "Espece inconnue");
//     const existing = bySpecies.get(key) ?? [];
//     existing.push({
//       plantLabel: `Plant #${plant.id}`,
//       documentation,
//     });
//     bySpecies.set(key, existing);
//   });

//   return Array.from(bySpecies.entries())
//     .map(([species, rows]) => ({
//       species,
//       rows,
//     }))
//     .sort((left, right) => left.species.localeCompare(right.species, "fr"));
// }

// function DocumentationTable({ title, groups }) {
//   return (
//     <section className="users-table-panel">
//       <div className="users-table-header">
//         <h2>{title}</h2>
//       </div>

//       {groups.length === 0 ? (
//         <p className="muted-text">Aucune documentation disponible.</p>
//       ) : (
//         <div className="users-table-wrapper">
//           <table className="users-table">
//             <thead>
//               <tr>
//                 <th>Espece</th>
//                 <th>Plant</th>
//                 <th>Documentation</th>
//               </tr>
//             </thead>
//             <tbody>
//               {groups.map((group) =>
//                 group.rows.map((row, index) => (
//                   <tr key={`${group.species}-${row.plantLabel}`}>
//                     {index === 0 ? (
//                       <td rowSpan={group.rows.length}>
//                         {group.species}
//                       </td>
//                     ) : null}
//                     <td>{row.plantLabel}</td>
//                     <td style={{ whiteSpace: "pre-wrap" }}>{row.documentation}</td>
//                   </tr>
//                 ))
//               )}
//             </tbody>
//           </table>
//         </div>
//       )}
//     </section>
//   );
// }

// function PlantDocumentationsPage() {
//   const { parcelleId, projectId } = useParams();
//   const [plants, setPlants] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [errorMessage, setErrorMessage] = useState("");

//   useEffect(() => {
//     let isMounted = true;

//     async function fetchPlants() {
//       setLoading(true);
//       setErrorMessage("");

//       try {
//         const { data } = await getParcellePlants(parcelleId);
//         if (isMounted) {
//           setPlants(normalizePlants(data));
//         }
//       } catch (error) {
//         if (isMounted) {
//           setPlants([]);
//           setErrorMessage(
//             error.response?.data?.message || "Impossible de charger les documentations."
//           );
//         }
//       } finally {
//         if (isMounted) {
//           setLoading(false);
//         }
//       }
//     }

//     if (parcelleId) {
//       fetchPlants();
//     } else {
//       setLoading(false);
//       setPlants([]);
//     }

//     return () => {
//       isMounted = false;
//     };
//   }, [parcelleId]);

//   const aliveGroups = useMemo(
//     () => buildSpeciesGroups(plants.filter((plant) => plant.status === "vivant")),
//     [plants]
//   );
//   const deadGroups = useMemo(
//     () => buildSpeciesGroups(plants.filter((plant) => plant.status === "mort")),
//     [plants]
//   );

//   const backHref =
//     projectId && parcelleId
//       ? `/dashboard/projet/${projectId}/parcelles/${parcelleId}`
//       : "/dashboard";

//   return (
//     <section className="users-page">
//       <header className="docs-header">
//         <h1>Documentations</h1>
//         <p>Consultez les documentations enregistrees pour les plants.</p>
//         <Link className="secondary-action docs-back" to={backHref}>
//           Retour a la parcelle
//         </Link>
//       </header>

//       {loading ? <p className="muted-text">Chargement...</p> : null}
//       {errorMessage ? <p className="form-error">{errorMessage}</p> : null}

//       {!loading && !errorMessage ? (
//         <>
//           <DocumentationTable
//             title="Plants vivants"
//             groups={aliveGroups}
//           />
//           <DocumentationTable
//             title="Plants morts"
//             groups={deadGroups}
//           />
//         </>
//       ) : null}
//     </section>
//   );
// }

// export default PlantDocumentationsPage;

