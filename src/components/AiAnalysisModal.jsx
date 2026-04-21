import { X, Bot, Loader2 } from "lucide-react";
import ReactMarkdown from "react-markdown";

export default function AiAnalysisModal({ isOpen, onClose, isLoading, resultText, error }) {
  if (!isOpen) return null;

  return (
    <>
      <style>{`
        .markdown-body h1, .markdown-body h2, .markdown-body h3 { color: var(--primary); margin-top: 1.5em; margin-bottom: 0.5em; }
        .markdown-body p { margin-bottom: 1em; }
        .markdown-body ul, .markdown-body ol { margin-left: 20px; list-style-position: outside; margin-bottom: 1em; }
        .markdown-body li { margin-bottom: 0.5em; }
        .markdown-body strong { font-weight: 600; color: var(--text); }
        .anim-spin { animation: spin 1s linear infinite; }
        @keyframes spin { 100% { transform: rotate(360deg); } }
      `}</style>
      <div style={{
        position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: "rgba(0,0,0,0.5)", zIndex: 1000,
        display: "flex", justifyContent: "center", alignItems: "center", padding: "1rem"
      }}>
        <div style={{
          background: "var(--surface)", width: "100%", maxWidth: "800px", maxHeight: "90vh",
          borderRadius: "var(--radius-lg)", display: "flex", flexDirection: "column",
          boxShadow: "var(--shadow-xl)"
        }}>
          <div style={{
            padding: "1.25rem 1.5rem", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center", background: "var(--surface-hover)", borderRadius: "var(--radius-lg) var(--radius-lg) 0 0"
          }}>
            <h2 style={{ margin: 0, fontSize: "1.2rem", display: "flex", alignItems: "center", gap: "0.5rem", color: "var(--primary)" }}>
              <Bot size={24} /> Analyse IA (Gemini)
            </h2>
            <button onClick={onClose} style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--muted-text)" }}>
              <X size={20} />
            </button>
          </div>

          <div style={{ padding: "1.5rem", overflowY: "auto", flex: 1, fontSize: "1rem", lineHeight: "1.6", color: "var(--text)" }}>
            {isLoading ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "200px", color: "var(--muted-text)" }}>
                <Loader2 size={48} className="anim-spin" style={{ marginBottom: "1rem", opacity: 0.5, color: "var(--primary)" }} />
                <p>L'IA analyse les données en cours... Veuillez patienter.</p>
              </div>
            ) : error ? (
              <div className="form-error" style={{ textAlign: "center", padding: "2rem" }}>
                <p>{error}</p>
              </div>
            ) : resultText ? (
              <div className="markdown-body">
                <ReactMarkdown>{resultText}</ReactMarkdown>
              </div>
            ) : (
              <p style={{ textAlign: "center", color: "var(--muted-text)" }}>Aucun résultat à afficher.</p>
            )}
          </div>

          <div style={{ padding: "1.25rem 1.5rem", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "flex-end", background: "var(--surface-hover)", borderRadius: "0 0 var(--radius-lg) var(--radius-lg)" }}>
            <button type="button" onClick={onClose} className="secondary-action">Fermer</button>
          </div>
        </div>
      </div>
    </>
  );
}
