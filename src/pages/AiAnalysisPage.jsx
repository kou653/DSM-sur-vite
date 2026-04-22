import { ArrowLeft, Brain, Download, Loader2, Sparkles, Wand2, FileText, CheckCircle2, AlertCircle } from "lucide-react";
import { useEffect, useState, useCallback } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import { analyzePageContext } from "../api/ai.js";
import jsPDF from "jspdf";

function AiAnalysisPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { projectId } = useParams();

  // Data passed from previous page
  const { context, data: initialData } = location.state || {};

  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState("");
  const [error, setError] = useState("");

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
      setResult(res.data.result);
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Une erreur est survenue lors de l'analyse.");
    } finally {
      setLoading(false);
    }
  }, [context, initialData]);

  useEffect(() => {
    startAnalysis();
  }, [startAnalysis]);

  const exportToPDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;

    doc.setFontSize(22);
    doc.setTextColor(20, 150, 85);
    doc.text("Dronek AI - Rapport d'Analyse", margin, 30);

    doc.setFontSize(12);
    doc.setTextColor(100, 100, 100);
    doc.text(`Contexte : ${context}`, margin, 40);
    doc.text(`Date : ${new Date().toLocaleDateString()}`, margin, 48);

    doc.setDrawColor(200, 200, 200);
    doc.line(margin, 55, pageWidth - margin, 55);

    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);

    const splitText = doc.splitTextToSize(result, pageWidth - (margin * 2));
    doc.text(splitText, margin, 65);

    doc.save(`Analyse_IA_${new Date().getTime()}.pdf`);
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
          <button onClick={exportToPDF} disabled={loading || !result} className="dashboard-add-button" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Download size={16} /> Télécharger PDF
          </button>
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
