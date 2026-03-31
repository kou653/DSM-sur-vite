import { Link } from "react-router-dom";

function NotFoundPage() {
  return (
    <section className="panel">
      <p className="eyebrow">Erreur</p>
      <h2>Page introuvable</h2>
      <p>La route demandee n'existe pas.</p>
      <Link className="text-link" to="/login">
        Revenir a la connexion
      </Link>
    </section>
  );
}

export default NotFoundPage;
