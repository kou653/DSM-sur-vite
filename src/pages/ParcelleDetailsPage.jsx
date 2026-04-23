import { Activity, ArrowLeft, Building2, CheckCircle2, ChevronDown, Crosshair, FileText, MapPinned, Plus, Target, X, ZoomIn, Sparkles, TreePine, Filter, Calendar, MapPin, Wand2, Trash2, AlertCircle, Brain, ClipboardList, Sprout } from "lucide-react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { Document, Packer, Paragraph, ImageRun, HeadingLevel, AlignmentType, Table, TableRow, TableCell, WidthType, BorderStyle, TextRun } from "docx";
import { saveAs } from "file-saver";
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

import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import { getParcelle } from "../api/parcelles.js";
import { createPlant, getParcellePlants, updatePlantDocumentation } from "../api/plants.js";
import { getEspeces } from "../api/referentiels.js";
import { useAuth } from "../contexts/auth-context.js";

const MONTH_LABELS = ["Jan", "Fev", "Mar", "Avr", "Mai", "Juin", "Juil", "Aou", "Sep", "Oct", "Nov", "Dec"];

function buildMonthlyEvolution(plants) {
  const monthlyMap = new Map();
  plants.forEach((plant) => {
    const rawDate = plant.date_plantation;
    if (!rawDate) return;
    const date = new Date(rawDate);
    if (Number.isNaN(date.getTime())) return;
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    const existing = monthlyMap.get(monthKey) ?? {
      key: monthKey,
      label: `${MONTH_LABELS[date.getMonth()]} ${date.getFullYear()}`,
      plantsMiseEnTerre: 0,
      plantsVivants: 0,
    };
    existing.plantsMiseEnTerre += 1;
    if ((plant.status || "") === "vivant") existing.plantsVivants += 1;
    monthlyMap.set(monthKey, existing);
  });
  return Array.from(monthlyMap.values()).sort((a, b) => a.key.localeCompare(b.key));
}

function buildSpeciesSummary(plants) {
  const summaryMap = new Map();
  plants.forEach((plant) => {
    const speciesName = plant.espece?.nom_commun || "Inconnu";
    const existing = summaryMap.get(speciesName) ?? {
      espece: speciesName,
      vivants: 0,
      morts: 0,
      total: 0,
    };
    existing.total += 1;
    if ((plant.status || "") === "vivant") existing.vivants += 1;
    if ((plant.status || "") === "mort") existing.morts += 1;
    summaryMap.set(speciesName, existing);
  });
  return Array.from(summaryMap.values()).sort((a, b) => a.espece.localeCompare(b.espece));
}

function ParcelleDetailsPage() {
  const navigate = useNavigate();
  const { role, selectedProjectId } = useAuth();
  const { parcelleId } = useParams();

  // Core parcelle info
  const [parcelle, setParcelle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  // Plants
  const [plants, setPlants] = useState([]);
  const [loadingPlants, setLoadingPlants] = useState(true);
  const [columnFilters, setColumnFilters] = useState({ espece: "", nom_scientifique: "", status: "" });
  const [openDropdown, setOpenDropdown] = useState(null);

  // Plant documentation
  const [isDocumentationFormOpen, setIsDocumentationFormOpen] = useState(false);
  const [documentationPlant, setDocumentationPlant] = useState(null);
  const [documentationText, setDocumentationText] = useState("");
  const [documentationSubmitting, setDocumentationSubmitting] = useState(false);
  const [documentationError, setDocumentationError] = useState("");
  const [documentationSuccess, setDocumentationSuccess] = useState("");

  // GPS helper (geolocation)
  const [gpsPicking, setGpsPicking] = useState(false);
  const [gpsError, setGpsError] = useState("");
  const [gpsSuccess, setGpsSuccess] = useState("");

  // Reference data
  const [especes, setEspeces] = useState([]);

  // Plants Form
  const [isPlantFormOpen, setIsPlantFormOpen] = useState(false);
  const [plantSubmitting, setPlantSubmitting] = useState(false);
  const [plantFormError, setPlantFormError] = useState("");
  const [lastAiAnalysis, setLastAiAnalysis] = useState("");
  const [showReportDropdown, setShowReportDropdown] = useState(false);

  // Plant Autocomplete
  const [especeSearch, setEspeceSearch] = useState("");
  const [showEspeceDropdown, setShowEspeceDropdown] = useState(false);

  const [plantFormState, setPlantFormState] = useState({
    espece_id: "",
    date_plantation: new Date().toISOString().slice(0, 10),
    status: "vivant",
    lat: "",
    lng: ""
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    setErrorMessage("");

    try {
      const [parcelleRes, especesRes, plantsRes] = await Promise.all([
        getParcelle(parcelleId),
        getEspeces(),
        getParcellePlants(parcelleId).catch(() => ({ data: [] }))
      ]);

      const parcelleData = parcelleRes.data.parcelle || parcelleRes.data;
      setParcelle(parcelleData);

      const rawEspeces = Array.isArray(especesRes.data)
        ? especesRes.data
        : especesRes.data?.especes || especesRes.data?.data || [];
      setEspeces(rawEspeces);

      const rawPlants = Array.isArray(plantsRes.data)
        ? plantsRes.data
        : plantsRes.data?.plants || plantsRes.data?.data || [];
      setPlants(rawPlants);

      // Inherit coordinates if not manually filled yet in form
      setPlantFormState(prev => ({
        ...prev,
        lat: prev.lat || parcelleData.lat || "",
        lng: prev.lng || parcelleData.lng || ""
      }));

    } catch {
      setErrorMessage("Impossible de charger les sous-données de la parcelle.");
    } finally {
      setLoading(false);
      setLoadingPlants(false);
    }
  }, [parcelleId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (parcelleId) {
      const saved = localStorage.getItem(`last_ai_analysis_parcelle_${parcelleId}`);
      if (saved) setLastAiAnalysis(saved);
    }
  }, [parcelleId]);

  useEffect(() => {
    if (!showReportDropdown) return;
    const close = () => setShowReportDropdown(false);
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [showReportDropdown]);

  useEffect(() => {
    if (!openDropdown) return;
    const close = () => setOpenDropdown(null);
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [openDropdown]);

  const refreshPlants = async () => {
    try {
      const plantsRes = await getParcellePlants(parcelleId);
      const rawPlants = Array.isArray(plantsRes.data)
        ? plantsRes.data
        : plantsRes.data?.plants || plantsRes.data?.data || [];
      setPlants(rawPlants);
    } catch {
      // Handle plant refresh fail
    }
  };

  function openDocumentationForm(plant) {
    setDocumentationSuccess("");
    setDocumentationError("");
    setDocumentationPlant(plant);
    setDocumentationText(plant?.documentation || "");
    setIsDocumentationFormOpen(true);
  }

  function closeDocumentationForm() {
    setIsDocumentationFormOpen(false);
    setDocumentationPlant(null);
    setDocumentationText("");
    setDocumentationSubmitting(false);
    setDocumentationError("");
  }

  async function handleSaveDocumentation(event) {
    event.preventDefault();

    if (!documentationPlant?.id) {
      setDocumentationError("Plant introuvable.");
      return;
    }

    setDocumentationSubmitting(true);
    setDocumentationError("");
    setDocumentationSuccess("");

    try {
      await updatePlantDocumentation(documentationPlant.id, documentationText);
      await refreshPlants();
      setDocumentationSuccess("Documentation enregistree.");
      setIsDocumentationFormOpen(false);
      setDocumentationPlant(null);
      setDocumentationText("");
    } catch (error) {
      setDocumentationError(
        error.response?.data?.message || "Impossible d'enregistrer la documentation."
      );
    } finally {
      setDocumentationSubmitting(false);
    }
  }

  function getCurrentPosition() {
    if (!navigator.geolocation) {
      return Promise.reject(new Error("Geolocalisation indisponible."));
    }

    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (position) => resolve(position),
        (error) => reject(error),
        { enableHighAccuracy: true, timeout: 12000 }
      );
    });
  }

  async function handlePickCurrentGpsForForm() {
    setGpsSuccess("");
    setGpsError("");
    setGpsPicking(true);

    try {
      const position = await getCurrentPosition();
      const { latitude, longitude } = position.coords || {};

      if (typeof latitude !== "number" || typeof longitude !== "number") {
        throw new Error("Coordonnees GPS invalides.");
      }

      setPlantFormState((current) => ({
        ...current,
        lat: String(latitude),
        lng: String(longitude),
      }));

      setGpsSuccess("Position actuelle appliquee au formulaire.");
    } catch (error) {
      setGpsError(error?.message || "Impossible de recuperer la position actuelle.");
    } finally {
      setGpsPicking(false);
    }
  }

  function handlePlantInputChange(e) {
    const { name, value } = e.target;
    setPlantFormState(cur => ({ ...cur, [name]: value }));
  }

  async function handleCreatePlant(e) {
    e.preventDefault();
    setPlantSubmitting(true);
    setPlantFormError("");

    try {
      await createPlant({
        parcelle_id: parcelleId,
        espece_id: plantFormState.espece_id,
        date_plantation: plantFormState.date_plantation,
        status: plantFormState.status,
        lat: Number(plantFormState.lat),
        lng: Number(plantFormState.lng)
      });
      await fetchData();
      await refreshPlants();
      setIsPlantFormOpen(false);
      setPlantFormState({
        espece_id: "",
        date_plantation: new Date().toISOString().slice(0, 10),
        status: "vivant",
        lat: parcelle?.lat || "",
        lng: parcelle?.lng || ""
      });
      setEspeceSearch("");
    } catch (error) {
      setPlantFormError(error.response?.data?.message || "Erreur de création du plant.");
    } finally {
      setPlantSubmitting(false);
    }
  }

  const monthlyEvolution = useMemo(() => buildMonthlyEvolution(plants), [plants]);
  const speciesSummary = useMemo(() => buildSpeciesSummary(plants), [plants]);

  const handleAiAnalysis = () => {
    const data = {
      parcelle: parcelle?.nom,
      superficie: parcelle?.superficie,
      ville: parcelle?.ville,
      objectif: parcelle?.objectif,
      objectif_atteint: parcelle?.objectif_atteint,
      cooperative: parcelle?.cooperative?.nom,
      plantes_totales: plants.length,
      especes: speciesSummary.map(s => ({ nom: s.espece, vivants: s.vivants, morts: s.morts }))
    };

    navigate(`/dashboard/projet/${selectedProjectId}/analyse-ia`, {
      state: { context: "Détails de la parcelle", data, parcelleId }
    });
  };

  const exportPDF = async () => {
    const mainElement = document.querySelector(".users-page");
    if (!mainElement) return;

    const chartContainer = document.getElementById("pdf-monitoring-chart");
    if (chartContainer) {
      chartContainer.style.position = "relative";
      chartContainer.style.left = "auto";
      chartContainer.style.top = "auto";
      chartContainer.style.visibility = "visible";
      chartContainer.style.height = "560px";
    }

    const summaryTableContainer = document.getElementById("pdf-species-summary-table");
    if (summaryTableContainer) {
      summaryTableContainer.style.position = "relative";
      summaryTableContainer.style.left = "auto";
      summaryTableContainer.style.top = "auto";
      summaryTableContainer.style.visibility = "visible";
      summaryTableContainer.style.height = "auto";
    }

    mainElement.classList.add("is-exporting");

    try {
      await new Promise((resolve) => setTimeout(resolve, 500));

      const pdf = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a4",
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const margin = 10;
      const printableWidth = pdfWidth - margin * 2;
      let currentY = margin;

      const selectors = [
        ".pdf-only-header",
        ".users-toolbar",
        "#parcelle-objective-row",
        "#parcelle-info-grid",
        "#pdf-monitoring-chart",
        "#pdf-species-summary-table",
        "#parcelle-ai-section",
      ];

      let isFirstSection = true;

      for (const selector of selectors) {
        const element = document.querySelector(selector);
        if (!element || element.offsetHeight === 0) continue;

        const canvas = await html2canvas(element, {
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: "#ffffff",
          windowWidth: 1200,
        });

        const imgData = canvas.toDataURL("image/png");
        const imgProps = pdf.getImageProperties(imgData);
        const imgHeightMm = (imgProps.height * printableWidth) / imgProps.width;

        if (!isFirstSection && currentY + imgHeightMm > pdfHeight - margin) {
          pdf.addPage();
          currentY = margin;
        }

        pdf.addImage(imgData, "PNG", margin, currentY, printableWidth, imgHeightMm);
        currentY += imgHeightMm + 8;
        isFirstSection = false;
      }

      pdf.save(`Parcelle-${parcelle?.nom || parcelleId}-${new Date().toISOString().slice(0, 10)}.pdf`);
    } catch (error) {
      console.error("PDF Export error:", error);
    } finally {
      mainElement.classList.remove("is-exporting");
      if (chartContainer) {
        chartContainer.style.position = "absolute";
        chartContainer.style.left = "-9999px";
        chartContainer.style.top = "0";
        chartContainer.style.visibility = "hidden";
      }
      if (summaryTableContainer) {
        summaryTableContainer.style.position = "absolute";
        summaryTableContainer.style.left = "-9999px";
        summaryTableContainer.style.top = "0";
        summaryTableContainer.style.visibility = "hidden";
      }
    }
  };

  const exportWord = async () => {
    const chartContainer = document.getElementById("pdf-monitoring-chart");
    if (chartContainer) {
      chartContainer.style.position = "relative";
      chartContainer.style.left = "auto";
      chartContainer.style.top = "auto";
      chartContainer.style.visibility = "visible";
      chartContainer.style.height = "560px";
    }

    try {
      await new Promise((resolve) => setTimeout(resolve, 300));
      const docChildren = [];

      docChildren.push(new Paragraph({
        text: `Rapport Parcelle - ${parcelle.nom}`,
        heading: HeadingLevel.HEADING_1,
        alignment: AlignmentType.CENTER,
      }));
      docChildren.push(new Paragraph({
        text: `Généré le ${new Date().toLocaleDateString()}`,
        alignment: AlignmentType.CENTER,
      }));
      docChildren.push(new Paragraph({ text: "" }));

      docChildren.push(new Paragraph({ text: "Statistiques Globales", heading: HeadingLevel.HEADING_2 }));
      docChildren.push(new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph({ text: "Objectif de la parcelle", bold: true })] }),
              new TableCell({ children: [new Paragraph({ text: "Évolution de l'objectif", bold: true })] }),
            ],
          }),
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph(`${parcelle.objectif_atteint || 0} / ${parcelle.objectif || 0} plants`)] }),
              new TableCell({ children: [new Paragraph(`${(parcelle.objectif > 0 ? (parcelle.objectif_atteint / parcelle.objectif) * 100 : 0).toFixed(1)}% Réalisé`)] }),
            ],
          }),
        ],
      }));
      docChildren.push(new Paragraph({ text: "" }));

      docChildren.push(new Paragraph({ text: "Détails de la Parcelle", heading: HeadingLevel.HEADING_2 }));
      docChildren.push(new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({ children: [new TableCell({ children: [new Paragraph({ text: "Superficie", bold: true })] }), new TableCell({ children: [new Paragraph(`${parcelle.superficie || "-"} ha`)] })] }),
          new TableRow({ children: [new TableCell({ children: [new Paragraph({ text: "Ville", bold: true })] }), new TableCell({ children: [new Paragraph(parcelle.ville || "-")] })] }),
          new TableRow({ children: [new TableCell({ children: [new Paragraph({ text: "Coopérative", bold: true })] }), new TableCell({ children: [new Paragraph(parcelle.cooperative?.nom || "-")] })] }),
          new TableRow({ children: [new TableCell({ children: [new Paragraph({ text: "Coordonnées", bold: true })] }), new TableCell({ children: [new Paragraph(`${parcelle.lat}, ${parcelle.lng}`)] })] }),
        ],
      }));
      docChildren.push(new Paragraph({ text: "" }));

      if (chartContainer) {
        docChildren.push(new Paragraph({ text: "Suivi Temporel", heading: HeadingLevel.HEADING_2 }));
        const canvas = await html2canvas(chartContainer, { scale: 2, backgroundColor: "#ffffff" });
        const imgData = canvas.toDataURL("image/png");
        const response = await fetch(imgData);
        const buffer = await response.arrayBuffer();
        docChildren.push(new Paragraph({
          children: [new ImageRun({ data: buffer, transformation: { width: 600, height: (canvas.height * 600) / canvas.width } })],
          alignment: AlignmentType.CENTER,
        }));
        docChildren.push(new Paragraph({ text: "" }));
      }

      docChildren.push(new Paragraph({ text: "Inventaire par Espèce", heading: HeadingLevel.HEADING_2 }));
      docChildren.push(new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph({ text: "Espèce", bold: true })] }),
              new TableCell({ children: [new Paragraph({ text: "Vivant", bold: true })] }),
              new TableCell({ children: [new Paragraph({ text: "Mort", bold: true })] }),
              new TableCell({ children: [new Paragraph({ text: "Total", bold: true })] }),
            ],
          }),
          ...speciesSummary.map(item => new TableRow({
            children: [
              new TableCell({ children: [new Paragraph(item.espece)] }),
              new TableCell({ children: [new Paragraph(String(item.vivants))] }),
              new TableCell({ children: [new Paragraph(String(item.morts))] }),
              new TableCell({ children: [new Paragraph(String(item.total))] }),
            ],
          })),
        ],
      }));
      docChildren.push(new Paragraph({ text: "" }));

      if (lastAiAnalysis) {
        docChildren.push(new Paragraph({ text: "Analyse Dronek (IA)", heading: HeadingLevel.HEADING_2 }));
        lastAiAnalysis.split("\n").forEach(line => {
          if (!line.trim()) return;
          let heading = null;
          if (line.startsWith("# ")) heading = HeadingLevel.HEADING_1;
          else if (line.startsWith("## ")) heading = HeadingLevel.HEADING_2;
          else if (line.startsWith("### ")) heading = HeadingLevel.HEADING_3;
          if (heading) docChildren.push(new Paragraph({ text: line.replace(/^#+\s/, ""), heading }));
          else docChildren.push(new Paragraph({ children: [new TextRun(line.replace(/\*\*/g, ""))] }));
        });
      }

      const doc = new Document({ sections: [{ properties: {}, children: docChildren }] });
      const blob = await Packer.toBlob(doc);
      saveAs(blob, `Parcelle-${parcelle?.nom || parcelleId}-${new Date().toISOString().slice(0, 10)}.docx`);
    } catch (error) {
      console.error("Word Export error:", error);
    } finally {
      if (chartContainer) {
        chartContainer.style.position = "absolute";
        chartContainer.style.left = "-9999px";
        chartContainer.style.top = "0";
        chartContainer.style.visibility = "hidden";
      }
    }
  };

  if (loading) {
    return <section className="users-page"><p className="muted-text">Chargement des détails de la parcelle...</p></section>;
  }

  if (!parcelle || errorMessage) {
    return <section className="users-page"><p className="form-error">{errorMessage || "Parcelle introuvable"}</p></section>;
  }

  const objectifCible = parcelle.objectif || 0;
  const objectifAtteint = parcelle.objectif_atteint || 0;
  const progressPercentage = objectifCible > 0 ? Math.min((objectifAtteint / objectifCible) * 100, 100) : 0;
  const canManage = ["administrateur", "agent terrain"].includes(role);

  const filteredPlants = plants.filter((plant) => {
    const matchesEspece = !columnFilters.espece || (plant.espece?.nom_commun || "Inconnu") === columnFilters.espece;
    const matchesScientifique = !columnFilters.nom_scientifique || (plant.espece?.nom_scientifique || "-") === columnFilters.nom_scientifique;
    const matchesStatus = !columnFilters.status || plant.status === columnFilters.status;
    return matchesEspece && matchesScientifique && matchesStatus;
  });

  const uniquePlantValues = {
    espece: [...new Set(plants.map((p) => p.espece?.nom_commun || "Inconnu"))].sort(),
    nom_scientifique: [...new Set(plants.map((p) => p.espece?.nom_scientifique || "-"))].sort(),
    status: [...new Set(plants.map((p) => p.status))].sort(),
  };

  return (
    <section className="users-page" style={{ paddingBottom: "4rem" }}>
      {/* Breadcrumb / Top Return */}
      <div className="pdf-only-header">
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <img src="/Fichier 3.png" alt="Logo" style={{ height: "45px" }} />
          <div>
            <h1 style={{ color: "#149655", margin: 0, fontSize: "1.5rem" }}>{parcelle.nom || `Parcelle #${parcelle.id}`}</h1>
            <p style={{ color: "#666", margin: 0 }}>Rapport de Détails</p>
          </div>
        </div>
        <p style={{ color: "#666", textAlign: "right", margin: 0 }}>Généré le {new Date().toLocaleDateString()}</p>
      </div>

      <div style={{ marginBottom: "1.5rem" }} className="breadcrumb">
        <Link to={`/dashboard/projet/${selectedProjectId}/parcelles`} style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", textDecoration: "none", color: "var(--muted-text)", fontWeight: "500", fontSize: "0.95rem" }}>
          <ArrowLeft size={16} />
          Retour aux parcelles
        </Link>
      </div>

      <div className="users-toolbar">
        <div className="users-hero" style={{ margin: 0 }}>
          <div>
            <h1>{parcelle.nom || `Parcelle #${parcelle.id}`}</h1>
          </div>
        </div>
        <div style={{ display: "flex", gap: "10px" }}>
          <button
            type="button"
            onClick={handleAiAnalysis}
            className="secondary-action"
            style={{ display: "flex", alignItems: "center", gap: "8px", background: "var(--surface-hover)", borderColor: "var(--primary)", color: "var(--primary)" }}
          >
            <Sparkles size={16} />
            Analyser (IA)
          </button>
          
          <div style={{ position: "relative" }}>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setShowReportDropdown(!showReportDropdown); }}
              className="dashboard-add-button"
              style={{ display: "flex", alignItems: "center", gap: "8px" }}
            >
              <FileText size={16} />
              Rapport
              <ChevronDown size={14} style={{ transform: showReportDropdown ? "rotate(180deg)" : "none", transition: "transform 0.2s" }} />
            </button>
            
            {showReportDropdown && (
              <div style={{
                position: "absolute",
                top: "calc(100% + 5px)",
                right: 0,
                background: "white",
                borderRadius: "var(--radius-md)",
                boxShadow: "var(--shadow-lg)",
                border: "1px solid var(--border)",
                zIndex: 100,
                minWidth: "160px",
                overflow: "hidden"
              }}>
                <button 
                  onClick={exportPDF}
                  style={{
                    width: "100%",
                    padding: "10px 15px",
                    textAlign: "left",
                    background: "none",
                    border: "none",
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    cursor: "pointer",
                    fontSize: "0.9rem",
                    transition: "background 0.2s"
                  }}
                  onMouseOver={(e) => e.currentTarget.style.background = "var(--surface-hover)"}
                  onMouseOut={(e) => e.currentTarget.style.background = "none"}
                >
                  <FileText size={14} color="#ef4444" /> Format PDF
                </button>
                <button 
                  onClick={exportWord}
                  style={{
                    width: "100%",
                    padding: "10px 15px",
                    textAlign: "left",
                    background: "none",
                    border: "none",
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    cursor: "pointer",
                    fontSize: "0.9rem",
                    transition: "background 0.2s"
                  }}
                  onMouseOver={(e) => e.currentTarget.style.background = "var(--surface-hover)"}
                  onMouseOut={(e) => e.currentTarget.style.background = "none"}
                >
                  <FileText size={14} color="#3b82f6" /> Format Word (.docx)
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div id="parcelle-objective-row" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "1.5rem", marginBottom: "2rem" }}>

        {/* Objectif Block */}
        <article style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", padding: "1.5rem" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
            <p className="eyebrow" style={{ margin: 0, display: "flex", alignItems: "center", gap: "0.5rem" }}><Target size={16} /> Objectif de la parcelle</p>
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: "0.75rem" }}>
            <h2 style={{ fontSize: "2.5rem", margin: 0, color: "var(--text)" }}>{objectifAtteint}</h2>
            <span style={{ fontSize: "1.5rem", fontWeight: "600", color: "var(--muted-text)" }}>/ {objectifCible}</span>
          </div>
        </article>

        {/* Evolution Block */}
        <article style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", padding: "1.5rem", display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <p className="eyebrow" style={{ margin: "0 0 1rem 0", display: "flex", alignItems: "center", gap: "0.5rem" }}><Activity size={16} /> Évolution de l'objectif</p>

          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: "0.5rem" }}>
            <span style={{ fontWeight: "600", fontSize: "1.1rem" }}>{progressPercentage.toFixed(1)}% Réalisé</span>
            <span style={{ color: "var(--muted-text)", fontSize: "0.9rem" }}>{objectifCible - objectifAtteint > 0 ? `${objectifCible - objectifAtteint} restants` : "Cible atteinte !"}</span>
          </div>

          <div style={{ width: "100%", height: "12px", background: "var(--surface-hover)", borderRadius: "6px", overflow: "hidden", position: "relative" }}>
            <div
              style={{
                position: "absolute", left: 0, top: 0, bottom: 0,
                width: `${progressPercentage}%`,
                background: progressPercentage >= 100 ? "#10b981" : "var(--primary)",
                borderRadius: "6px",
                transition: "width 0.5s ease"
              }}
            />
          </div>
        </article>
      </div>

      {/* Row 2: 4 Info Blocks */}
      <div id="parcelle-info-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1.5rem", marginBottom: "2.5rem" }}>

        <article className="dashboard-stat-card">
          <div className="dashboard-stat-icon"><MapPinned size={16} strokeWidth={2.1} /></div>
          <div>
            <p>Ville</p>
            <h3 style={{ fontSize: "1.1rem" }}>{parcelle.ville || "-"}</h3>
          </div>
        </article>
        <article className="dashboard-stat-card">
          <div className="dashboard-stat-icon"><ZoomIn size={16} strokeWidth={2.1} /></div>
          <div>
            <p>Superficie</p>
            <h3 style={{ fontSize: "1.1rem" }}>{parcelle.superficie || "0"} ha</h3>
          </div>
        </article>
        <article className="dashboard-stat-card">
          <div className="dashboard-stat-icon"><Building2 size={16} strokeWidth={2.1} /></div>
          <div>
            <p>Coopérative</p>
            <h3 style={{ fontSize: "1.1rem" }}>{parcelle.cooperative?.nom || "-"}</h3>
          </div>
        </article>
        <article className="dashboard-stat-card">
          <div className="dashboard-stat-icon"><Crosshair size={16} strokeWidth={2.1} /></div>
          <div>
            <p>Plants enregistrés</p>
            <h3 style={{ fontSize: "1.1rem" }}>{plants.length}</h3>
          </div>
        </article>
      </div>

      {/* Hidden Monitoring Chart – rendered off-screen for PDF capture */}
      <div
        id="pdf-monitoring-chart"
        style={{
          position: "absolute",
          left: "-9999px",
          top: 0,
          visibility: "hidden",
          width: "1100px",
          height: "560px",
          background: "#fff",
          padding: "1.5rem 1.5rem 2rem 1.5rem",
          boxSizing: "border-box",
        }}
      >
        <h2 style={{ margin: "0 0 1rem 0", fontSize: "1.1rem", color: "#149655" }}>Évolution mensuelle des plants</h2>
        {monthlyEvolution.length === 0 ? (
          <p style={{ color: "#888" }}>Aucune donnée mensuelle disponible.</p>
        ) : (
          <ResponsiveContainer width="100%" height={440}>
            <LineChart data={monthlyEvolution}>
              <CartesianGrid strokeDasharray="3 3" stroke="#d9e6db" />
              <XAxis dataKey="label" stroke="#6f8272" />
              <YAxis allowDecimals={false} stroke="#6f8272" />
              <Tooltip
                contentStyle={{
                  borderRadius: "14px",
                  border: "1px solid #d8e7da",
                  boxShadow: "0 12px 28px rgba(52,88,62,0.1)",
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
                isAnimationActive={false}
                connectNulls
              />
              <Line
                type="monotone"
                dataKey="plantsVivants"
                name="Plants vivants"
                stroke="#f59e0b"
                strokeWidth={3}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
                isAnimationActive={false}
                connectNulls
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Hidden Species Summary Table – rendered off-screen for PDF capture */}
      <div
        id="pdf-species-summary-table"
        style={{
          position: "absolute",
          left: "-9999px",
          top: 0,
          visibility: "hidden",
          width: "100%",
          background: "#fff",
          padding: "1.5rem",
          boxSizing: "border-box",
        }}
      >
        <h2 style={{ margin: "0 0 1.5rem 0", fontSize: "1.2rem", color: "#149655", borderBottom: "2px solid var(--border)", paddingBottom: "0.5rem" }}>
          Inventaire par Espèce
        </h2>
        {speciesSummary.length === 0 ? (
          <p style={{ color: "#888" }}>Aucun plant enregistré pour cette parcelle.</p>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.95rem", tableLayout: "fixed" }}>
            <thead>
              <tr style={{ backgroundColor: "var(--surface-hover)", color: "var(--text)" }}>
                <th style={{ width: "40%", padding: "12px 16px", borderBottom: "1px solid var(--border)", fontWeight: "600" }}>Espèce</th>
                <th style={{ width: "20%", padding: "12px 16px", borderBottom: "1px solid var(--border)", fontWeight: "600" }}>Vivant</th>
                <th style={{ width: "20%", padding: "12px 16px", borderBottom: "1px solid var(--border)", fontWeight: "600" }}>Mort</th>
                <th style={{ width: "20%", padding: "12px 16px", borderBottom: "1px solid var(--border)", fontWeight: "600" }}>Total (Espèce)</th>
              </tr>
            </thead>
            <tbody>
              {speciesSummary.map((item, index) => (
                <tr key={item.espece} style={{
                  borderBottom: "1px solid var(--border)",
                  backgroundColor: index % 2 === 0 ? "#fff" : "var(--surface-hover)"
                }}>
                  <td style={{ padding: "12px 16px", fontWeight: "500", color: "var(--text)" }}>{item.espece}</td>
                  <td style={{ padding: "12px 16px", color: "var(--primary)", fontWeight: "600" }}>{item.vivants}</td>
                  <td style={{ padding: "12px 16px", color: "var(--primary)", fontWeight: "600" }}>{item.morts}</td>
                  <td style={{ padding: "12px 16px", fontWeight: "700", color: "#1f9953" }}>{item.total}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Plants Table Section (Visible on Screen) */}
      <section className="users-table-panel">
        <div className="users-table-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3>Liste des plants de la parcelle</h3>
          {canManage && (
            <button type="button" className="dashboard-add-button" onClick={() => setIsPlantFormOpen(!isPlantFormOpen)}>
              {isPlantFormOpen ? <X size={14} strokeWidth={2.4} /> : <Plus size={14} strokeWidth={2.4} />}
              {isPlantFormOpen ? "Fermer" : "Ajouter un plant"}
            </button>
          )}
        </div>

        {/* Inline Create Form */}
        {isPlantFormOpen && (
          <div style={{ padding: "1.5rem", background: "var(--surface-hover)", borderBottom: "1px solid var(--border)" }}>
            <h3 style={{ marginTop: 0, marginBottom: "1rem", fontSize: "1.1rem" }}>Enregistrer un nouveau plant</h3>
            {plantFormError && <p className="form-error" style={{ marginBottom: "1rem" }}>{plantFormError}</p>}
            {gpsError ? <p className="form-error" style={{ marginBottom: "1rem" }}>{gpsError}</p> : null}
            {gpsSuccess ? <p className="evolution-success" style={{ marginBottom: "1rem" }}>{gpsSuccess}</p> : null}

            <form onSubmit={handleCreatePlant} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1rem", alignItems: "start" }}>
              <div className="filter-field" style={{ position: "relative" }}>
                <span>Espèce (Autocomplétion)</span>
                <input
                  type="text"
                  placeholder="Rechercher une espèce..."
                  value={especeSearch}
                  onChange={(e) => {
                    setEspeceSearch(e.target.value);
                    setShowEspeceDropdown(true);
                    setPlantFormState(cur => ({ ...cur, espece_id: "" }));
                  }}
                  onFocus={() => setShowEspeceDropdown(true)}
                  required
                />
                {showEspeceDropdown && especeSearch && !plantFormState.espece_id && (
                  <ul
                    style={{
                      position: "absolute", top: "100%", left: 0, right: 0, zIndex: 10,
                      background: "var(--surface)", border: "1px solid var(--border)",
                      maxHeight: "150px", overflowY: "auto", listStyle: "none", padding: 0, margin: 0,
                      boxShadow: "var(--shadow-md)"
                    }}
                  >
                    {especes
                      .filter(e =>
                        e.nom_commun?.toLowerCase().includes(especeSearch.toLowerCase()) ||
                        e.nom_scientifique?.toLowerCase().includes(especeSearch.toLowerCase())
                      )
                      .map(e => (
                        <li
                          key={e.id}
                          style={{ padding: "0.75rem", cursor: "pointer", borderBottom: "1px solid var(--border-soft)" }}
                          onMouseDown={(evt) => evt.preventDefault()}
                          onClick={() => {
                            setPlantFormState(cur => ({ ...cur, espece_id: e.id }));
                            setEspeceSearch(`${e.nom_commun} (${e.nom_scientifique})`);
                            setShowEspeceDropdown(false);
                          }}
                        >
                          <strong>{e.nom_commun}</strong> <span style={{ color: "var(--muted-text)", fontSize: "0.85em" }}>({e.nom_scientifique})</span>
                        </li>
                      ))}
                  </ul>
                )}
              </div>

              <label className="filter-field">
                <span>Date de plantation</span>
                <input type="date" name="date_plantation" value={plantFormState.date_plantation} onChange={handlePlantInputChange} required />
              </label>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "1rem" }}>
                <label className="filter-field">
                  <span>GPS Lat</span>
                  <input type="number" step="0.00000001" name="lat" value={plantFormState.lat} onChange={handlePlantInputChange} required />
                </label>
                <label className="filter-field">
                  <span>GPS Lng</span>
                  <input type="number" step="0.00000001" name="lng" value={plantFormState.lng} onChange={handlePlantInputChange} required />
                </label>
              </div>

              <div style={{ gridColumn: "1 / -1", display: "flex", justifyContent: "flex-end" }}>
                <button
                  type="button"
                  className="secondary-action"
                  onClick={handlePickCurrentGpsForForm}
                  disabled={gpsPicking}
                >
                  <Crosshair size={14} strokeWidth={2} /> {gpsPicking ? "Position..." : "Position actuelle"}
                </button>
              </div>

              <label className="filter-field">
                <span>État</span>
                <select name="status" value={plantFormState.status} onChange={handlePlantInputChange} required>
                  <option value="vivant">Vivant</option>
                  <option value="mort">Mort</option>
                </select>
              </label>

              <div style={{ gridColumn: "1 / -1", display: "flex", justifyContent: "flex-end" }}>
                <button type="submit" className="primary-action" disabled={plantSubmitting}>
                  {plantSubmitting ? "Enregistrement..." : "Créer le plant"}
                </button>
              </div>
            </form>
          </div>
        )}

        {canManage && isDocumentationFormOpen ? (
          <div style={{ padding: "1.5rem", background: "var(--surface-hover)", borderBottom: "1px solid var(--border)" }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "12px" }}>
              <div>
                <h3 style={{ marginTop: 0, marginBottom: "0.25rem", fontSize: "1.1rem" }}>
                  Documenter le plant #{documentationPlant?.id}
                </h3>
                <p className="muted-text" style={{ marginTop: 0 }}>
                  {documentationPlant?.espece?.nom_commun || "Espece"} ({documentationPlant?.espece?.nom_scientifique || "-"})
                </p>
              </div>
              <button
                type="button"
                className="secondary-action"
                onClick={closeDocumentationForm}
                disabled={documentationSubmitting}
              >
                Fermer
              </button>
            </div>

            {documentationError ? (
              <p className="form-error" style={{ marginBottom: "1rem" }}>
                {documentationError}
              </p>
            ) : null}

            <form onSubmit={handleSaveDocumentation} style={{ display: "grid", gap: "12px" }}>
              <label className="filter-field">
                <span>Documentation</span>
                <textarea
                  rows={4}
                  value={documentationText}
                  onChange={(event) => setDocumentationText(event.target.value)}
                  placeholder="Decrivez l'observation, les actions menees, ou toute information utile..."
                />
              </label>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                <button type="submit" className="primary-action" disabled={documentationSubmitting}>
                  {documentationSubmitting ? "Enregistrement..." : "Enregistrer"}
                </button>
                <button type="button" className="secondary-action" onClick={closeDocumentationForm} disabled={documentationSubmitting}>
                  Annuler
                </button>
              </div>
            </form>
          </div>
        ) : null}

        {documentationSuccess ? (
          <p className="evolution-success" style={{ margin: "12px 18px 0" }}>
            {documentationSuccess}
          </p>
        ) : null}

        {gpsError ? (
          <p className="form-error" style={{ margin: "12px 18px 0" }}>
            {gpsError}
          </p>
        ) : null}
        {gpsSuccess ? (
          <p className="evolution-success" style={{ margin: "12px 18px 0" }}>
            {gpsSuccess}
          </p>
        ) : null}

        {/* Plants Data Table */}
        {!loadingPlants && plants.length === 0 ? (
          <p className="muted-text" style={{ padding: "1.5rem" }}>Aucun plant enregistré pour cette parcelle.</p>
        ) : null}

        {loadingPlants ? (
          <p className="muted-text" style={{ padding: "1.5rem" }}>Chargement des plants...</p>
        ) : null}

        {!loadingPlants && plants.length > 0 && (
          <div className="users-table-wrapper">
            <table className="users-table">
              <thead>
                <tr>
                  {[
                    { key: "espece", label: "Espèce" },
                    { key: "nom_scientifique", label: "Nom scientifique" },
                  ].map(({ key, label }) => (
                    <th key={key} style={{ position: "relative" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span>{label}</span>
                        <button
                          type="button"
                          style={{ background: "none", border: "none", padding: 0, cursor: "pointer", display: "flex", alignItems: "center" }}
                          onClick={(e) => { e.stopPropagation(); setOpenDropdown((prev) => (prev === key ? null : key)); }}
                        >
                          <ChevronDown size={13} strokeWidth={2} />
                          {columnFilters[key] && (
                            <span style={{ display: "inline-block", width: 7, height: 7, borderRadius: "50%", background: "var(--primary, #16a34a)", marginLeft: 3 }} />
                          )}
                        </button>
                      </div>

                      {openDropdown === key && (
                        <div style={{
                          position: "absolute", top: "100%", left: 0, zIndex: 50,
                          background: "var(--surface, #fff)", border: "1px solid var(--border, #e2e8f0)",
                          borderRadius: 8, boxShadow: "0 4px 16px rgba(0,0,0,0.10)", minWidth: 200, padding: "6px 0",
                        }}>
                          <button type="button"
                            onClick={() => { setColumnFilters((f) => ({ ...f, [key]: "" })); setOpenDropdown(null); }}
                            style={{ display: "block", width: "100%", textAlign: "left", padding: "7px 14px", background: "none", border: "none", cursor: "pointer", fontStyle: "italic", color: "var(--muted-text, #94a3b8)" }}
                          >
                            Tous
                          </button>
                          {uniquePlantValues[key].map((val) => (
                            <button key={val} type="button"
                              onClick={() => { setColumnFilters((f) => ({ ...f, [key]: val })); setOpenDropdown(null); }}
                              style={{ display: "block", width: "100%", textAlign: "left", padding: "7px 14px", background: columnFilters[key] === val ? "var(--surface-hover, #dcfce7)" : "none", border: "none", cursor: "pointer", fontWeight: columnFilters[key] === val ? 600 : 400 }}
                            >
                              {val}
                            </button>
                          ))}
                        </div>
                      )}
                    </th>
                  ))}

                  <th>GPS</th>
                  <th>Date de plantation</th>

                  {/* Colonne État avec dropdown */}
                  <th style={{ position: "relative" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span>État</span>
                      <button
                        type="button"
                        style={{ background: "none", border: "none", padding: 0, cursor: "pointer", display: "flex", alignItems: "center" }}
                        onClick={(e) => { e.stopPropagation(); setOpenDropdown((prev) => (prev === "status" ? null : "status")); }}
                      >
                        <ChevronDown size={13} strokeWidth={2} />
                        {columnFilters.status && (
                          <span style={{ display: "inline-block", width: 7, height: 7, borderRadius: "50%", background: "var(--primary, #16a34a)", marginLeft: 3 }} />
                        )}
                      </button>
                    </div>

                    {openDropdown === "status" && (
                      <div style={{
                        position: "absolute", top: "100%", left: 0, zIndex: 50,
                        background: "var(--surface, #fff)", border: "1px solid var(--border, #e2e8f0)",
                        borderRadius: 8, boxShadow: "0 4px 16px rgba(0,0,0,0.10)", minWidth: 150, padding: "6px 0",
                      }}>
                        <button type="button"
                          onClick={() => { setColumnFilters((f) => ({ ...f, status: "" })); setOpenDropdown(null); }}
                          style={{ display: "block", width: "100%", textAlign: "left", padding: "7px 14px", background: "none", border: "none", cursor: "pointer", fontStyle: "italic", color: "var(--muted-text, #94a3b8)" }}
                        >
                          Tous
                        </button>
                        {uniquePlantValues.status.map((val) => (
                          <button key={val} type="button"
                            onClick={() => { setColumnFilters((f) => ({ ...f, status: val })); setOpenDropdown(null); }}
                            style={{ display: "block", width: "100%", textAlign: "left", padding: "7px 14px", background: columnFilters.status === val ? "var(--surface-hover, #dcfce7)" : "none", border: "none", cursor: "pointer", fontWeight: columnFilters.status === val ? 600 : 400 }}
                          >
                            {val === "vivant" ? "Vivant" : "Mort"}
                          </button>
                        ))}
                      </div>
                    )}
                  </th>

                  <th>Documenter</th>
                </tr>
              </thead>
              <tbody>
                {filteredPlants.map(plant => (
                  <tr key={plant.id}>
                    <td><strong>{plant.espece?.nom_commun || "Inconnu"}</strong></td>
                    <td><em style={{ color: "var(--muted-text)" }}>{plant.espece?.nom_scientifique || "-"}</em></td>
                    <td><span style={{ fontSize: "0.85rem", background: "var(--surface-hover)", padding: "0.2rem 0.5rem", borderRadius: "10px" }}>{plant.lat}, {plant.lng}</span></td>
                    <td>{plant.date_plantation ? new Date(plant.date_plantation).toLocaleDateString() : "-"}</td>
                    <td>
                      <span style={{
                        display: "inline-flex", alignItems: "center", gap: "0.25rem", padding: "0.25rem 0.5rem", borderRadius: "20px", fontSize: "0.85rem", fontWeight: "500",
                        background: plant.status === "vivant" ? "rgba(16, 185, 129, 0.1)" : "rgba(239, 68, 68, 0.1)",
                        color: plant.status === "vivant" ? "#10b981" : "#ef4444"
                      }}>
                        {plant.status === "vivant" ? <CheckCircle2 size={12} /> : <X size={12} />}
                        {plant.status === "vivant" ? "Vivant" : "Mort"}
                      </span>
                    </td>
                    <td>
                      {canManage ? (
                        <button
                          type="button"
                          className="secondary-action"
                          style={{ padding: "6px 10px", fontSize: "0.85rem", display: "inline-flex", alignItems: "center", gap: "6px" }}
                          onClick={() => openDocumentationForm(plant)}
                        >
                          <FileText size={14} strokeWidth={2} />
                          Documenter
                        </button>
                      ) : (
                        <span className="muted-text">--</span>
                      )}
                    </td>
                  </tr>
                ))}
                {filteredPlants.length === 0 && (
                  <tr>
                    <td colSpan={6} style={{ textAlign: "center", padding: "1.5rem" }} className="muted-text">
                      Aucun plant ne correspond aux filtres.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>



      {/* AI Analysis Section at the bottom (Hidden on screen, visible in PDF) */}
      {lastAiAnalysis && (
        <section id="parcelle-ai-section" style={{ 
          marginTop: "3rem", 
          background: "#ffffff", 
          borderRadius: "var(--radius-lg)", 
          padding: "2rem", 
          border: "1px solid #b9e7cb", 
          boxShadow: "var(--shadow-sm)",
          // Hidden by default on screen
          position: "absolute",
          left: "-9999px",
          top: "0",
          visibility: "hidden"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "1.5rem", paddingBottom: "1rem", borderBottom: "1px solid #b9e7cb" }}>
            <Sparkles size={24} className="primary-text" />
            <h2 style={{ fontSize: "1.3rem", margin: 0 }}>Analyse Dronek</h2>
          </div>
          <div className="markdown-body" style={{ fontSize: "1.05rem", lineHeight: "1.7", color: "var(--text)" }}>
            <ReactMarkdown>{lastAiAnalysis}</ReactMarkdown>
          </div>
        </section>
      )}

      <style>{`
        .markdown-body h1, .markdown-body h2, .markdown-body h3 { color: var(--primary); margin-top: 1.5em; margin-bottom: 0.5em; }
        .markdown-body p { margin-bottom: 1em; }
        .markdown-body ul, .markdown-body ol { margin-left: 20px; list-style-position: outside; margin-bottom: 1em; }
        .markdown-body li { margin-bottom: 0.5em; }
        .markdown-body strong { font-weight: 600; color: var(--text); }
        #parcelle-ai-section { display: block; }
        .is-exporting #parcelle-ai-section { 
          position: relative !important; 
          left: auto !important; 
          top: auto !important; 
          visibility: visible !important; 
          border: none !important; 
          background: none !important; 
          box-shadow: none !important; 
          padding: 1rem 0 !important; 
        }
        .is-exporting #parcelle-ai-section div { border-bottom: 2px solid var(--primary) !important; padding-left: 0 !important; }
      `}</style>
    </section>
  );
}

export default ParcelleDetailsPage;
