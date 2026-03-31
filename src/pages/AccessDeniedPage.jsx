import { Link } from "react-router-dom";

function AccessDeniedPage() {
  return (
    <section className="panel">
      <p className="eyebrow">Acces refuse</p>
      <h2>Vous n'avez pas l'autorisation requise</h2>
      <p>
        Cette ressource est protegee par les permissions de votre compte ou par
        les droits du projet selectionne.
      </p>
      <Link className="text-link" to="/projects">
        Revenir a la liste des projets
      </Link>
    </section>
  );
}

export default AccessDeniedPage;
