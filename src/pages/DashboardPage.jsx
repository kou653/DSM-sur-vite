import { Building2, Activity, MapPinned, Crosshair, Target, Sprout, TrendingUp, NotebookTabs, TreePine, Trees, Layers, Users } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from "chart.js";
import { Bar, Pie } from "react-chartjs-2";

// API
import { useAuth } from "../contexts/auth-context.js";
import { getProjet } from "../api/projets.js";
import { getProjectMonitoring } from "../api/monitoring.js";
import { getProjetParcelles } from "../api/parcelles.js";
import { getProjetCooperatives } from "../api/referentiels.js";

// Chart.js registration
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

function DashboardPage() {
  const { selectedProjectId } = useAuth();

  const [projet, setProjet] = useState(null);
  const [monitoring, setMonitoring] = useState(null);
  const [parcelles, setParcelles] = useState([]);
  const [cooperatives, setCooperatives] = useState([]);

  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const fetchDashboardData = useCallback(async () => {
    if (!selectedProjectId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setErrorMessage("");

    try {
      const [projRes, monRes, parcRes, coopRes] = await Promise.all([
        getProjet(selectedProjectId),
        getProjectMonitoring(selectedProjectId),
        getProjetParcelles(selectedProjectId),
        getProjetCooperatives(selectedProjectId)
      ]);

      const pData = projRes.data?.projet || projRes.data;
      setProjet(pData);

      const mData = monRes.data?.stats_globales || monRes.data;
      setMonitoring(mData);

      const parcs = Array.isArray(parcRes.data) ? parcRes.data : parcRes.data?.parcelles || parcRes.data?.data || [];
      setParcelles(parcs);

      const coops = Array.isArray(coopRes.data) ? coopRes.data : coopRes.data?.cooperatives || coopRes.data?.data || [];
      setCooperatives(coops);

    } catch (error) {
      console.error(error);
      setErrorMessage("Impossible de charger les sous-données du projet.");
    } finally {
      setLoading(false);
    }
  }, [selectedProjectId]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  if (loading) {
    return <section className="users-page"><p className="muted-text">Chargement de la vue d'ensemble...</p></section>;
  }

  if (errorMessage || !projet) {
    return <section className="users-page"><p className="form-error">{errorMessage || "Erreur de chargement"}</p></section>;
  }

  // --- Derived Data ---
  const objProjet = Number(projet.objectif || 0);
  const effectifPlantes = parcelles.reduce((acc, p) => acc + (p.plants_count || 0), 0);
  const evolutionGlobalPercent = objProjet > 0 ? Math.min(100, (effectifPlantes / objProjet) * 100) : 0;

  // --- Chart Data configuration ---
  // Bar Chart: Objectives vs Actually Planted
  const barChartData = {
    labels: parcelles.map(p => p.nom || `Parcelle #${p.id}`),
    datasets: [
      {
        label: "Cible (Objectif)",
        data: parcelles.map(p => p.objectif || 0),
        backgroundColor: "rgba(0, 0, 0, 1)",
        borderColor: "rgb(75, 74, 74)",
        borderWidth: 1,
        borderRadius: 4,
        maxBarThickness: 40
      },
      {
        label: "Actuel (Mis en terre)",
        data: parcelles.map(p => p.plants_count || 0),
        backgroundColor: "rgba(20, 150, 85, 1)",
        borderColor: "rgb(20, 150, 85)",
        borderWidth: 1,
        borderRadius: 4,
        maxBarThickness: 40
      }
    ]
  };

  const barChartOptions = {
    barPercentage: 1,
    categoryPercentage: 0.2,
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: "top" },
      title: { display: false }
    },
    scales: {
      y: { beginAtZero: true }
    }
  };

  // Pie Chart: Alive vs Dead
  const vivants = monitoring?.vivants || 0;
  const morts = monitoring?.morts || 0;

  return (
    <section className="users-page" style={{ paddingBottom: "4rem" }}>
      {/* 1. Titre du projet */}
      <header style={{ marginBottom: "2rem" }}>
        <h1 style={{ fontSize: "2rem", color: "#149655", margin: "0 0 0.5rem 0", display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <Trees size={28} className="primary-text" />
          {projet.nom}
        </h1>
        <p className="muted-text" style={{ margin: 0, fontSize: "1.1rem" }}>Vue d'ensemble et progression générale du projet.</p>
      </header>

      {/* 2. Les 6 Blocs (4 en haut, 2 en bas) */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1.5rem", marginBottom: "3rem" }}>
        {/* Objectif Projet */}
        <article className="dashboard-stat-card">
          <div className="dashboard-stat-icon"><Target size={18} /></div>
          <div>
            <p style={{ textTransform: "uppercase", fontSize: "0.78rem", letterSpacing: "0.05em" }}>Objectif Projet</p>
            <h3 style={{ fontSize: "1.6rem" }}>{objProjet} plants</h3>
          </div>
        </article>

        {/* Parcelles */}
        <Link to={`/dashboard/projet/${selectedProjectId}/parcelles`} className="dashboard-stat-card hover-card-effect" style={{ textDecoration: "none", color: "inherit", cursor: "pointer" }}>
          <div className="dashboard-stat-icon" style={{ background: "rgba(16,185,129,0.1)", color: "#10b981" }}><Layers size={18} /></div>
          <div>
            <p style={{ textTransform: "uppercase", fontSize: "0.78rem", letterSpacing: "0.05em" }}>Parcelles</p>
            <h3 style={{ fontSize: "1.6rem" }}>{parcelles.length}</h3>
          </div>
        </Link>

        {/* Coopératives */}
        <Link to={`/dashboard/projet/${selectedProjectId}/cooperatives`} className="dashboard-stat-card hover-card-effect" style={{ textDecoration: "none", color: "inherit", cursor: "pointer" }}>
          <div className="dashboard-stat-icon" style={{ background: "rgba(16,185,129,0.1)", color: "#10b981" }}><Users size={18} /></div>
          <div>
            <p style={{ textTransform: "uppercase", fontSize: "0.78rem", letterSpacing: "0.05em" }}>Coopératives</p>
            <h3 style={{ fontSize: "1.6rem" }}>{cooperatives.length}</h3>
          </div>
        </Link>

        {/* Evolution */}
        <article className="dashboard-stat-card" style={{ display: "flex", flexDirection: "column", alignItems: "stretch", justifyContent: "center" }}>
          <p style={{ margin: "0 0 0.4rem 0", textTransform: "uppercase", fontSize: "0.78rem", letterSpacing: "0.05em", display: "flex", alignItems: "center", gap: "0.35rem" }}>
            <Activity size={14} color="#0f7352ff" /> Évolution des objectifs
          </p>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <h3 style={{ margin: 0, fontSize: "1.4rem", minWidth: "52px" }}>{evolutionGlobalPercent.toFixed(0)}%</h3>
            <div style={{ flex: 1, height: "10px", background: "var(--surface-hover)", borderRadius: "4px", overflow: "hidden" }}>
              <div style={{ width: `${evolutionGlobalPercent}%`, height: "100%", background: "var(--primary)", borderRadius: "4px" }} />
            </div>
          </div>
        </article>

        {/* Plants Vivants */}
        <article className="dashboard-stat-card">
          <div className="dashboard-stat-icon" style={{ background: "rgba(16,185,129,0.1)", color: "#10b981" }}><Sprout size={18} /></div>
          <div>
            <p style={{ textTransform: "uppercase", fontSize: "0.78rem", letterSpacing: "0.05em" }}>Plants vivants</p>
            <h3 style={{ fontSize: "1.6rem" }}>{vivants}</h3>
          </div>
        </article>

        {/* Taux de survie */}
        <Link to={`/dashboard/projet/${selectedProjectId}/monitoring`} className="dashboard-stat-card hover-card-effect" style={{ textDecoration: "none", color: "inherit" }}>
          <div className="dashboard-stat-icon" style={{ background: "rgba(16,185,129,0.1)", color: "#10b981" }}><TrendingUp size={18} /></div>
          <div>
            <p style={{ textTransform: "uppercase", fontSize: "0.78rem", letterSpacing: "0.05em" }}>Taux survie</p>
            <h3 style={{ fontSize: "1.6rem" }}>{monitoring?.taux_survie}%</h3>
          </div>
        </Link>
      </div>

      {/* 3. Section Chart : Evolution par parcelle */}
      <section style={{ marginBottom: "3rem" }}>
        <h2 style={{ fontSize: "1.3rem", display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem" }}>
          <Crosshair size={18} className="primary-text" />
          Évolution des objectifs par parcelle
        </h2>

        <div style={{ background: "#ffffff", borderRadius: "var(--radius-lg)", padding: "1.5rem", border: "1px solid #b9e7cb" }}>
          <div style={{ height: "350px", width: "100%" }}>
            <Bar data={barChartData} options={barChartOptions} />
          </div>

          {/* Petits blocs textuels intégrés (Parcelle: Cible vs Actuel) */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "1rem", marginTop: "2rem" }}>
            {parcelles.map(p => (
              <div key={p.id} style={{ background: "var(--surface-hover)", borderRadius: "var(--radius-md)", padding: "0.85rem 1rem", border: "1px solid #b9e7cb" }}>
                <h4 style={{ margin: "0 0 0.4rem 0", color: "var(--text)", fontSize: "0.9rem", display: "flex", alignItems: "center", gap: "4px" }}><TreePine size={14} className="primary-text" /> {p.nom}</h4>
                {/* <p style={{ margin: "0 0 0.2rem 0", fontSize: "0.9rem", color: "var(--text)" }}>{p.objectif || 0} plants</p> */}
                <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--muted-text)" }}>{p.plants_count || 0} / {p.objectif || 0} plants</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 4. Section Circulaire & Liste des superficies (Responsive Grid) */}
      <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "2rem", marginBottom: "3rem" }}>
        {/* Pie Chart */}
        {/* <div style={{ background: "#ffffff", borderRadius: "var(--radius-lg)", padding: "1.5rem", border: "1px solid #b9e7cb" }}>
           <h3 style={{ margin: "0 0 1rem 0", fontSize: "1.1rem" }}>Etat global écologique des plants</h3>
           <div style={{ height: "250px", width: "100%", display: "flex", justifyContent: "center" }}>
             <Pie data={pieChartData} options={pieChartOptions} />
           </div>
         </div> */}
        <div style={{ background: "#ffffff", borderRadius: "var(--radius-lg)", padding: "1.5rem", border: "1px solid #b9e7cb" }}>
          <h3 style={{ margin: "0 0 1rem 0", fontSize: "1.1rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span style={{ width: "16px", height: "16px", borderRadius: "50%", border: "2px solid #10b981", display: "inline-block" }} />
            État des plants
          </h3>
          <div style={{ height: "250px", width: "100%", display: "flex", justifyContent: "center" }}>
            <Pie
              data={{
                labels: ["Vivants", "Morts"],
                datasets: [{
                  data: [vivants, morts],
                  backgroundColor: ["#10b981", "#ef4444"],
                  hoverBackgroundColor: ["#059669", "#dc2626"],
                  borderWidth: 0,
                  hoverOffset: 4
                }]
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                cutout: "60%",
                plugins: {
                  legend: {
                    position: "bottom",
                    labels: {
                      usePointStyle: true,
                      pointStyle: "circle",
                      formatter: (label, ctx) => `${label}: ${ctx.dataset.data[ctx.dataIndex]}`
                    }
                  }
                }
              }}
            />
          </div>
        </div>

        {/* Liste Parcelles + Superficies */}
        {/* <div style={{ background: "#ffffff", borderRadius: "var(--radius-lg)", padding: "1.5rem", overflowY: "auto", maxHeight: "330px", border: "1px solid #b9e7cb" }}>
           <h3 style={{ margin: "0 0 1rem 0", fontSize: "1.1rem" }}>Répartition topographique</h3>
           <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
             {parcelles.map(p => (
               <li key={p.id} style={{ padding: "0.75rem 0", borderBottom: "1px solid var(--border-soft)", display: "flex", alignItems: "center", gap: "1rem" }}>
                 <span style={{ 
                   background: "var(--surface-hover)", 
                   color: "var(--primary)",  
                   padding: "0.25rem 0.5rem", 
                   borderRadius: "4px", 
                   fontSize: "0.85rem",
                   minWidth: "60px",
                   textAlign: "center"
                 }}>
                   {p.superficie} ha
                 </span>
                 <strong style={{ color: "var(--text)", display: "flex", alignItems: "center", gap: "6px" }}><TreePine size={16} className="primary-text" /> {p.nom}</strong>
               </li>
             ))}
             {parcelles.length === 0 && <p className="muted-text">Aucune parcelle associée.</p>}
           </ul>
         </div> */}
        <div style={{ background: "#ffffff", borderRadius: "var(--radius-lg)", padding: "1.5rem", overflowY: "auto", maxHeight: "330px", border: "1px solid #b9e7cb" }}>
          <h3 style={{ margin: "0 0 1.25rem 0", fontSize: "1.1rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Layers size={18} className="primary-text" /> Superficie des parcelles (ha)
          </h3>
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {parcelles.map(p => (
              <li key={p.id} style={{ padding: "0.85rem 1rem", borderRadius: "var(--radius-md)", border: "1px solid #b9e7cb", background: "var(--surface-hover)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ color: "var(--text)", fontSize: "0.95rem" }}>{p.nom}</span>
                <strong style={{ color: "var(--text)", fontSize: "0.95rem" }}>{p.superficie} ha</strong>
              </li>
            ))}
            {parcelles.length === 0 && <p className="muted-text">Aucune parcelle associée.</p>}
          </ul>
        </div>
      </section>

      {/* 5. Section Coopératives en bas */}
      <section style={{ background: "#ffffff", borderRadius: "var(--radius-lg)", padding: "1.5rem", border: "1px solid #b9e7cb" }}>
        <h2 style={{ fontSize: "1.3rem", display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1.5rem" }}>
          <Building2 size={18} className="primary-text" />
          Coopératives
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "1.5rem" }}>
          {cooperatives.map(coop => (
            <article key={coop.id} style={{ background: "var(--surface-hover)", borderRadius: "var(--radius-md)", padding: "1.25rem", border: "1px solid #b9e7cb" }}>
              <h3 style={{ margin: "0 0 0.5rem 0", fontSize: "1.1rem", color: "var(--text)" }}>{coop.nom}</h3>
              <p style={{ margin: "0 0 1rem 0", color: "var(--primary)", fontWeight: "500", fontSize: "0.9rem" }}>{coop.entreprise || "-"}</p>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", fontSize: "0.85rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "var(--muted-text)" }}>
                  <MapPinned size={14} /> <span>{coop.ville}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "var(--muted-text)" }}>
                  <NotebookTabs size={14} /> <span>{coop.contact || "Pas de contact"}</span>
                </div>
              </div>
            </article>
          ))}
          {cooperatives.length === 0 && <p className="muted-text">Aucune coopérative partenaire.</p>}
        </div>
      </section>

    </section>
  );
}

export default DashboardPage;
