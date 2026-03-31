import { Eye, EyeOff, TreePine } from "lucide-react";
import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/auth-context.js";

function LoginPage() {
  const navigate = useNavigate();
  const { isAuthenticated, loading, login } = useAuth();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [errorMessage, setErrorMessage] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  function handleChange(event) {
    const { name, value } = event.target;
    setFormData((currentData) => ({
      ...currentData,
      [name]: value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setErrorMessage("");

    try {
      await login(formData);
      navigate("/dashboard", { replace: true });
    } catch (error) {
      const nextMessage =
        error.response?.data?.message ||
        "Connexion impossible. Verifiez vos identifiants.";

      setErrorMessage(nextMessage);
    }
  }

  return (
    <section className="auth-page auth-page-login">
      <div className="auth-card auth-card-login">
        <div className="auth-brand">
          <div className="auth-brand-icon" aria-hidden="true">
            <TreePine size={30} strokeWidth={2.2} />
          </div>
          <h1>DSM</h1>
          <p>Plateforme de suivi-evaluation des projets de reboisement</p>
        </div>

        {errorMessage ? <p className="form-error">{errorMessage}</p> : null}

        <form className="auth-form" onSubmit={handleSubmit}>
          <label>
            <span>Adresse email</span>
            <input
              type="email"
              name="email"
              placeholder="nom@exemple.com"
              value={formData.email}
              onChange={handleChange}
              autoComplete="email"
              required
            />
          </label>

          <label>
            <span>Mot de passe</span>
            <div className="password-field">
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                placeholder="Votre mot de passe"
                value={formData.password}
                onChange={handleChange}
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword((currentValue) => !currentValue)}
                aria-label={
                  showPassword
                    ? "Masquer le mot de passe"
                    : "Afficher le mot de passe"
                }
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </label>

          <button
            type="submit"
            className="auth-submit"
            disabled={loading}
          >
            {loading ? "Connexion..." : "Se connecter"}
          </button>
        </form>
      </div>
    </section>
  );
}

export default LoginPage;
