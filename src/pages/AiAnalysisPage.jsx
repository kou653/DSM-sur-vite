import { ArrowLeft, Brain, Download, Loader2, Sparkles, Wand2, FileText, CheckCircle2, AlertCircle, ChevronDown } from "lucide-react";
import { useEffect, useState, useCallback } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import { analyzePageContext } from "../api/ai.js";
import jsPDF from "jspdf";
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from "docx";
import { saveAs } from "file-saver";

function AiAnalysisPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { projectId } = useParams();

  // Data passed from previous page
  const { context, data: initialData, parcelleId } = location.state || {};

  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState("");
  const [error, setError] = useState("");
  const [showReportDropdown, setShowReportDropdown] = useState(false);

  const startAnalysis = useCallback(async () => {
    if (!context || !initialData) {
      setError("Données d'analyse manquantes. Veuillez revenir à la page précédente.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");
    setResult("");

    try {
      const res = await analyzePageContext(context, initialData);
      const analysisResult = res.data.result;
      setResult(analysisResult);

      // Persist to localStorage
      if (context === "Détails de la parcelle" && parcelleId) {
        localStorage.setItem(`last_ai_analysis_parcelle_${parcelleId}`, analysisResult);
      } else if (context === "Tableau de bord - Vue d'ensemble du projet" && projectId) {
        localStorage.setItem(`last_ai_analysis_project_${projectId}`, analysisResult);
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Une erreur est survenue lors de l'analyse.");
    } finally {
      setLoading(false);
    }
  }, [context, initialData]);

  useEffect(() => {
    startAnalysis();
  }, [startAnalysis]);

  useEffect(() => {
    if (!showReportDropdown) return;
    const close = () => setShowReportDropdown(false);
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [showReportDropdown]);

  const exportToPDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;
    let cursorY = 45;

    // Header with Logo
    doc.addImage("/Fichier 3.png", "PNG", margin, 15, 12, 12);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.setTextColor(20, 150, 85);
    doc.text("Dronek AI", margin + 15, 25);

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(120, 120, 120);
    doc.text("Rapport d'analyse agronomique automatisé", margin + 15, 30);

    doc.setDrawColor(20, 150, 85);
    doc.setLineWidth(0.5);
    doc.line(margin, cursorY - 5, pageWidth - margin, cursorY - 5);

    // Metadata
    cursorY += 10;
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(50, 50, 50);
    doc.text(`Analyse : ${context}`, margin, cursorY);
    cursorY += 7;
    doc.setFont("helvetica", "normal");
    doc.text(`Généré le : ${new Date().toLocaleDateString()} à ${new Date().toLocaleTimeString()}`, margin, cursorY);

    cursorY += 15;

    // Parse and render result text
    const lines = result.split("\n");
    doc.setTextColor(0, 0, 0);

    lines.forEach(line => {
      if (cursorY > pageHeight - 20) {
        doc.addPage();
        cursorY = 20;
      }

      if (line.startsWith("### ")) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(13);
        doc.setTextColor(20, 150, 85);
        doc.text(line.replace("### ", ""), margin, cursorY);
        cursorY += 10;
      } else if (line.startsWith("## ")) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(15);
        doc.setTextColor(20, 150, 85);
        doc.text(line.replace("## ", ""), margin, cursorY);
        cursorY += 12;
      } else if (line.startsWith("# ")) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(18);
        doc.setTextColor(20, 150, 85);
        doc.text(line.replace("# ", ""), margin, cursorY);
        cursorY += 15;
      } else if (line.trim().startsWith("* ") || line.trim().startsWith("- ")) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(11);
        doc.setTextColor(60, 60, 60);
        const cleanLine = "• " + line.trim().substring(2);
        const splitText = doc.splitTextToSize(cleanLine, pageWidth - (margin * 2) - 5);
        doc.text(splitText, margin + 5, cursorY);
        cursorY += (splitText.length * 6);
      } else if (line.trim().length > 0) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(11);
        doc.setTextColor(60, 60, 60);
        // Remove bold markdown symbols **
        const cleanLine = line.replace(/\*\*/g, "");
        const splitText = doc.splitTextToSize(cleanLine, pageWidth - (margin * 2));
        doc.text(splitText, margin, cursorY);
        cursorY += (splitText.length * 7);
      } else {
        cursorY += 5; // Empty line
      }
    });

    // Footer
    const totalPages = doc.internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(9);
      doc.setTextColor(150, 150, 150);
      doc.text(`Page ${i} sur ${totalPages} - Document Dronek`, pageWidth / 2, pageHeight - 10, { align: "center" });
    }

    doc.save(`Rapport_Analyse_Dronek_${new Date().getTime()}.pdf`);
  };
  
  const exportToWord = async () => {
    const doc = new Document({
      sections: [
        {
          properties: {},
          children: [
            new Paragraph({
              text: "Rapport d'analyse Dronek AI",
              heading: HeadingLevel.HEADING_1,
            }),
            new Paragraph({
              children: [
                new TextRun({
                  text: `Analyse : ${context}`,
                  bold: true,
                }),
              ],
            }),
            new Paragraph({
              text: `Généré le : ${new Date().toLocaleDateString()} à ${new Date().toLocaleTimeString()}`,
            }),
            new Paragraph({ text: "" }), // Spacer
            ...result.split("\n").map(line => {
              if (line.startsWith("# ")) {
                return new Paragraph({ text: line.replace("# ", ""), heading: HeadingLevel.HEADING_1 });
              } else if (line.startsWith("## ")) {
                return new Paragraph({ text: line.replace("## ", ""), heading: HeadingLevel.HEADING_2 });
              } else if (line.startsWith("### ")) {
                return new Paragraph({ text: line.replace("### ", ""), heading: HeadingLevel.HEADING_3 });
              } else if (line.trim().startsWith("* ") || line.trim().startsWith("- ")) {
                return new Paragraph({
                  text: line.trim().substring(2),
                  bullet: { level: 0 },
                });
              } else {
                return new Paragraph({
                  children: [new TextRun(line.replace(/\*\*/g, ""))],
                });
              }
            }),
          ],
        },
      ],
    });

    const blob = await Packer.toBlob(doc);
    saveAs(blob, `Rapport_Analyse_Dronek_${new Date().getTime()}.docx`);
  };

  if (!location.state) {
    return (
      <div className="users-page" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "80vh" }}>
        <AlertCircle size={48} color="var(--error)" />
        <h2 style={{ marginTop: "1rem" }}>Accès direct non autorisé</h2>
        <p className="muted-text">Veuillez lancer l'analyse depuis une page du projet.</p>
        <button onClick={() => navigate(-1)} className="secondary-action" style={{ marginTop: "1.5rem" }}>
          <ArrowLeft size={16} /> Retour
        </button>
      </div>
    );
  }

  return (
    <div className="users-page" style={{ minHeight: "100vh", paddingBottom: "4rem" }}>
      {/* Header Bar */}
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "2rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <button onClick={() => navigate(-1)} className="secondary-action" style={{ padding: "0.5rem" }}>
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 style={{ fontSize: "1.75rem", margin: 0, display: "flex", alignItems: "center", gap: "1rem" }}>
              <Sparkles size={20} strokeWidth={2.4} />
              {/* <img src="/Fichier 3.png" alt="Logo" style={{ height: "45px" }} /> */}
              Analyse Intelligence Artificielle
            </h1>
            <p className="muted-text" style={{ margin: 0 }}>{context}</p>
          </div>
        </div>

        <div style={{ display: "flex", gap: "1rem" }}>
          <button onClick={startAnalysis} disabled={loading} className="secondary-action" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Wand2 size={16} /> Relancer l'analyse
          </button>
          
          <div style={{ position: "relative" }}>
            <button
              onClick={(e) => { e.stopPropagation(); setShowReportDropdown(!showReportDropdown); }}
              disabled={loading || !result}
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
                minWidth: "180px",
                overflow: "hidden"
              }}>
                <button 
                  onClick={exportToPDF}
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
                  onClick={exportToWord}
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
      </header>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: "2rem", alignItems: "start" }}>

        {/* Main Content Area */}
        <main style={{
          background: "var(--surface)",
          borderRadius: "var(--radius-lg)",
          border: "1px solid var(--border)",
          minHeight: "600px",
          padding: "2.5rem",
          boxShadow: "var(--shadow-sm)",
          position: "relative"
        }}>
          {loading ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", minHeight: "500px", gap: "1.5rem" }}>
              <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Sparkles size={30} strokeWidth={2.4} style={{ opacity: 0.3 }} />
                <Loader2 size={100} className="primary-text" style={{ position: "absolute", animation: "spin 2s linear infinite", opacity: 0.8 }} />
              </div>
              <div style={{ textAlign: "center" }}>
                <h3 style={{ margin: 0 }}>Génération des insights...</h3>
                <p className="muted-text">Nos algorithmes analysent vos données pour vous fournir les meilleures recommandations.</p>
              </div>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                {[1, 2, 3].map(i => (
                  <div key={i} style={{ width: "8px", height: "8px", borderRadius: "50%", background: "var(--primary)", opacity: 0.3, animation: `pulse 1.5s infinite ${i * 0.2}s` }} />
                ))}
              </div>
            </div>
          ) : error ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", minHeight: "500px", textAlign: "center" }}>
              <AlertCircle size={48} color="var(--error)" />
              <h3 style={{ marginTop: "1rem", color: "var(--error)" }}>Erreur d'analyse</h3>
              <p className="muted-text" style={{ maxWidth: "400px" }}>{error}</p>
              <button onClick={startAnalysis} className="primary-action" style={{ marginTop: "1.5rem" }}>Réessayer</button>
            </div>
          ) : (
            <div className="prose-container" style={{ animation: "fadeIn 0.5s ease-out" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "2rem", padding: "0.75rem 1rem", background: "rgba(20, 150, 85, 0.05)", borderRadius: "var(--radius-md)", border: "1px solid rgba(20, 150, 85, 0.1)" }}>
                <Sparkles size={18} className="primary-text" />
                <span style={{ fontSize: "0.9rem", fontWeight: "600", color: "var(--primary)" }}>Analyse générée avec succès par Dronek AI</span>
              </div>
              <div style={{ fontSize: "1.1rem", lineHeight: "1.7", color: "var(--text)" }}>
                <ReactMarkdown>{result}</ReactMarkdown>
              </div>
            </div>
          )}
        </main>

        {/* Sidebar Summary */}
        <aside style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          <div style={{ background: "var(--surface)", borderRadius: "var(--radius-lg)", border: "1px solid var(--border)", padding: "1.5rem" }}>
            <h3 style={{ fontSize: "1rem", marginBottom: "1.25rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <FileText size={18} /> Données analysées
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {Object.entries(initialData).map(([key, value]) => {
                if (typeof value === "object") return null;
                return (
                  <div key={key} style={{ paddingBottom: "0.75rem", borderBottom: "1px solid var(--border-soft)" }}>
                    <p style={{ fontSize: "0.75rem", textTransform: "uppercase", color: "var(--muted-text)", margin: "0 0 0.25rem 0", letterSpacing: "0.05em" }}>
                      {key.replace(/_/g, " ")}
                    </p>
                    <p style={{ fontSize: "1rem", fontWeight: "600", margin: 0 }}>{value}</p>
                  </div>
                );
              })}
            </div>
          </div>

          <div style={{ background: "rgba(20, 150, 85, 0.05)", borderRadius: "var(--radius-lg)", border: "1px solid rgba(20, 150, 85, 0.2)", padding: "1.5rem" }}>
            <h4 style={{ margin: "0 0 0.75rem 0", color: "var(--primary)", display: "flex", alignItems: "center", gap: "8px" }}>
              <CheckCircle2 size={16} /> Expertise Dronek
            </h4>
            <p style={{ fontSize: "0.85rem", color: "var(--text-soft)", lineHeight: "1.5", margin: 0 }}>
              Cette analyse est basée sur les données télémétriques et agronomiques collectées. Pour des décisions critiques, veuillez consulter un ingénieur agronome sur le terrain.
            </p>
          </div>
        </aside>
      </div>

      <style dangerouslySetInnerHTML={{
        __html: `
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes pulse { 0% { transform: scale(1); opacity: 0.3; } 50% { transform: scale(1.5); opacity: 0.7; } 100% { transform: scale(1); opacity: 0.3; } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        
        .prose-container h1, .prose-container h2, .prose-container h3 { color: var(--primary); margin-top: 2rem; margin-bottom: 1rem; }
        .prose-container ul, .prose-container ol { padding-left: 1.5rem; margin-bottom: 1.5rem; }
        .prose-container li { margin-bottom: 0.5rem; }
        .prose-container p { margin-bottom: 1.25rem; }
        .prose-container strong { color: var(--text); font-weight: 700; }
      `}} />
    </div>
  );
}

export default AiAnalysisPage;
