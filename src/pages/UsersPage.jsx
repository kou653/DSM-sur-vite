import {
  BriefcaseBusiness,
  ChevronDown,
  Mail,
  Pencil,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
  UserRound,
  Users,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { getProjets } from "../api/projets.js";
import {
  createUser,
  deleteUser,
  getUsers,
  updateUser,
} from "../api/users.js";
import { useAuth } from "../contexts/auth-context.js";

function normalizeUsers(payload) {
  const rawUsers = Array.isArray(payload) ? payload : payload?.users || payload?.data || [];

  return rawUsers.map((user) => ({
    id: Number(user.id),
    name: user.nom_complet || `Utilisateur ${user.id}`,
    email: user.email || "Email non renseigne",
    role: user.role || null,
    projects: user.projects || [],
    raw: user,
  }));
}

function normalizeProjects(payload) {
  const rawProjects = Array.isArray(payload)
    ? payload
    : payload?.projets || payload?.data || [];

  return rawProjects.map((project) => ({
    id: Number(project.id),
    name: project.nom || `Projet ${project.id}`,
  }));
}

function getRoleLabel(role) {
  if (role === "administrateur") return "Administrateur";
  if (role === "agent terrain") return "Agent terrain";
  if (role === "commanditaire") return "Commanditaire";
  return "Non defini";
}

function getInitials(name) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("");
}

function getRoleClassName(role) {
  if (role === "administrateur") return "users-role-pill users-role-pill-admin";
  if (role === "agent terrain") return "users-role-pill users-role-pill-agent";
  if (role === "commanditaire") return "users-role-pill users-role-pill-sponsor";
  return "users-role-pill";
}

function buildInitialFormState(user = null) {
  return {
    nom_complet: user?.raw?.nom_complet || "",
    email: user?.raw?.email || "",
    password: "",
    role: user?.raw?.role || "agent terrain",
    code_acces: user?.raw?.code_acces || "",
    projects: user?.projects?.map((project) => Number(project.id)) || [],
  };
}

function UsersPage() {
  const { role: currentUserRole } = useAuth();
  const [users, setUsers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [actionError, setActionError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [formState, setFormState] = useState(buildInitialFormState());

  async function fetchUsers() {
    setLoading(true);
    setErrorMessage("");

    try {
      const { data } = await getUsers();
      setUsers(normalizeUsers(data));
    } catch (error) {
      setErrorMessage(
        error.response?.data?.message || "Impossible de charger les utilisateurs."
      );
    } finally {
      setLoading(false);
    }
  }

  async function fetchProjects() {
    setProjectsLoading(true);

    try {
      const { data } = await getProjets();
      setProjects(normalizeProjects(data));
    } catch {
      setProjects([]);
    } finally {
      setProjectsLoading(false);
    }
  }

  useEffect(() => {
    fetchUsers();
    fetchProjects();
  }, []);

  const filteredUsers = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    if (!normalizedSearch) {
      return users;
    }

    return users.filter((user) =>
      [user.name, user.email, getRoleLabel(user.role)]
        .join(" ")
        .toLowerCase()
        .includes(normalizedSearch)
    );
  }, [searchTerm, users]);

  const stats = useMemo(() => {
    const total = users.length;
    const admins = users.filter((user) => user.role === "administrateur").length;
    const fieldAgents = users.filter((user) => user.role === "agent terrain").length;
    const sponsors = users.filter((user) => user.role === "commanditaire").length;

    return [
      { label: "Total utilisateurs", value: total, icon: Users },
      { label: "Administrateurs", value: admins, icon: ShieldCheck },
      { label: "Agents terrain", value: fieldAgents, icon: UserRound },
      { label: "Commanditaires", value: sponsors, icon: Users },
    ];
  }, [users]);

  function openCreateForm() {
    setEditingUser(null);
    setFormState(buildInitialFormState());
    setActionError("");
    setSuccessMessage("");
    setIsFormOpen(true);
  }

  function openEditForm(user) {
    setEditingUser(user);
    setFormState(buildInitialFormState(user));
    setActionError("");
    setSuccessMessage("");
    setIsFormOpen(true);
  }

  function closeForm() {
    setIsFormOpen(false);
    setEditingUser(null);
    setFormState(buildInitialFormState());
    setActionError("");
  }

  function handleInputChange(event) {
    const { name, value } = event.target;
    setFormState((current) => ({
      ...current,
      [name]: value,
    }));
  }

  function handleProjectToggle(projectId) {
    setFormState((current) => {
      const hasProject = current.projects.includes(projectId);

      return {
        ...current,
        projects: hasProject
          ? current.projects.filter((id) => id !== projectId)
          : [...current.projects, projectId],
      };
    });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    setActionError("");
    setSuccessMessage("");

    const payload = {
      nom_complet: formState.nom_complet.trim(),
      email: formState.email.trim(),
      role: formState.role,
      code_acces: formState.code_acces.trim(),
      projects: formState.projects,
    };

    if (!editingUser) {
      payload.password = formState.password;
    }

    try {
      if (editingUser) {
        await updateUser(editingUser.id, payload);
        setSuccessMessage("Utilisateur modifie avec succes.");
      } else {
        await createUser(payload);
        setSuccessMessage("Utilisateur cree avec succes.");
      }

      await fetchUsers();
      closeForm();
    } catch (error) {
      setActionError(
        error.response?.data?.message || "Operation impossible pour cet utilisateur."
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(user) {
    const confirmed = window.confirm(
      `Voulez-vous vraiment supprimer l'utilisateur ${user.name} ?`
    );

    if (!confirmed) {
      return;
    }

    setSubmitting(true);
    setActionError("");
    setSuccessMessage("");

    try {
      await deleteUser(user.id);
      setSuccessMessage("Utilisateur supprime avec succes.");
      await fetchUsers();
    } catch (error) {
      setActionError(
        error.response?.data?.message || "Suppression impossible pour cet utilisateur."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="users-page">
      <div className="users-toolbar">
        <div className="users-hero">
          <div className="users-hero-icon" aria-hidden="true">
            <Users size={22} strokeWidth={2.1} />
          </div>
          <div>
            <h1>Gestion des Utilisateurs</h1>
            <p>Gerer les acces et les affectations des utilisateurs</p>
          </div>
        </div>

        <div className="users-toolbar-actions">
          <label className="users-search">
            <Search size={16} strokeWidth={2} />
            <input
              type="search"
              placeholder="Rechercher un utilisateur"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
          </label>

          {currentUserRole === "administrateur" ? (
            <button type="button" className="dashboard-add-button" onClick={openCreateForm}>
              <Plus size={14} strokeWidth={2.4} />
              Creer
            </button>
          ) : null}
        </div>
      </div>

      {/* <div className="users-access-badge">Acces Administrateur uniquement</div> */}

      {errorMessage ? <p className="form-error">{errorMessage}</p> : null}
      {actionError ? <p className="form-error">{actionError}</p> : null}
      {successMessage ? <p className="evolution-success">{successMessage}</p> : null}

      <div className="users-stats-grid">
        {stats.map((stat) => {
          const Icon = stat.icon;

          return (
            <article key={stat.label} className="users-stat-card">
              <div className="users-stat-icon">
                <Icon size={18} strokeWidth={2} />
              </div>
              <div>
                <p>{stat.label}</p>
                <h2>{stat.value}</h2>
              </div>
            </article>
          );
        })}
      </div>

      {isFormOpen ? (
        <section className="users-form-panel">
          <div className="users-form-header">
            <div>
              <p className="eyebrow">{editingUser ? "Modifier" : "Creation"}</p>
              <h2>{editingUser ? "Modifier un utilisateur" : "Creer un utilisateur"}</h2>
            </div>

            <button type="button" className="secondary-action" onClick={closeForm}>
              <X size={16} strokeWidth={2} />
              Fermer
            </button>
          </div>

          <form className="users-form" onSubmit={handleSubmit}>
            <label className="filter-field">
              <span>Nom</span>
              <input
                type="text"
                name="nom_complet"
                value={formState.nom_complet}
                onChange={handleInputChange}
                required
              />
            </label>

            <label className="filter-field">
              <span>Email</span>
              <input
                type="email"
                name="email"
                value={formState.email}
                onChange={handleInputChange}
                required
              />
            </label>

            {!editingUser ? (
              <label className="filter-field">
                <span>Mot de passe</span>
                <input
                  type="password"
                  name="password"
                  value={formState.password}
                  onChange={handleInputChange}
                  minLength={8}
                  required
                />
              </label>
            ) : null}

            <label className="filter-field">
              <span>Role</span>
              <select name="role" value={formState.role} onChange={handleInputChange}>
                <option value="administrateur">Administrateur</option>
                <option value="agent terrain">Agent terrain</option>
                <option value="commanditaire">Commanditaire</option>
              </select>
            </label>

            <label className="filter-field">
              <span>Code d&apos;acces</span>
              <input
                type="text"
                name="code_acces"
                value={formState.code_acces}
                onChange={handleInputChange}
              />
            </label>

            <div className="filter-field">
              <span>Projets affectes</span>
              <div className="users-projects-picker">
                {projectsLoading ? <p className="muted-text">Chargement des projets...</p> : null}
                {!projectsLoading && projects.length === 0 ? (
                  <p className="muted-text">Aucun projet disponible.</p>
                ) : null}
                {projects.map((project) => (
                  <label key={project.id} className="users-project-option">
                    <input
                      type="checkbox"
                      checked={formState.projects.includes(project.id)}
                      onChange={() => handleProjectToggle(project.id)}
                    />
                    <span>{project.name}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="crud-actions">
              <button type="submit" className="primary-action" disabled={submitting}>
                {editingUser
                  ? submitting
                    ? "Mise a jour..."
                    : "Enregistrer"
                  : submitting
                    ? "Creation..."
                    : "Creer"}
              </button>
              <button type="button" className="secondary-action" onClick={closeForm}>
                Annuler
              </button>
            </div>
          </form>
        </section>
      ) : null}

      <section className="users-table-panel">
        <div className="users-table-header">
          <h2>Liste des utilisateurs ({filteredUsers.length})</h2>
        </div>

        {loading ? <p className="muted-text">Chargement des utilisateurs...</p> : null}

        {!loading && filteredUsers.length === 0 ? (
          <p className="muted-text">Aucun utilisateur ne correspond a la recherche.</p>
        ) : null}

        {!loading && filteredUsers.length > 0 ? (
          <div className="users-table-wrapper">
            <table className="users-table">
              <thead>
                <tr>
                  <th>
                    <span className="users-th-label">
                      Nom
                      <ChevronDown size={14} strokeWidth={2} />
                    </span>
                  </th>
                  <th>Email</th>
                  <th>
                    <span className="users-th-label">
                      Role
                      <ChevronDown size={14} strokeWidth={2} />
                    </span>
                  </th>
                  <th>Projets affectes</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => (
                  <tr key={user.id}>
                    <td>
                      <div className="users-name-cell">
                        <div className="users-avatar">{getInitials(user.name)}</div>
                        <span>{user.name}</span>
                      </div>
                    </td>
                    <td>
                      <div className="users-email-cell">
                        <Mail size={15} strokeWidth={2} />
                        <span>{user.email}</span>
                      </div>
                    </td>
                    <td>
                      <span className={getRoleClassName(user.role)}>
                        {getRoleLabel(user.role)}
                      </span>
                    </td>
                    <td>
                      <div className="users-projects-count">
                        <BriefcaseBusiness size={15} strokeWidth={2} />
                        <span>{user.projects.length} projet(s)</span>
                      </div>
                    </td>
                    <td>
                      <div className="users-table-actions">
                        <button
                          type="button"
                          className="secondary-action users-icon-button"
                          onClick={() => openEditForm(user)}
                          disabled={submitting || currentUserRole !== "administrateur"}
                        >
                          <Pencil size={14} strokeWidth={2} />
                        </button>
                        <button
                          type="button"
                          className="danger-action users-icon-button"
                          onClick={() => handleDelete(user)}
                          disabled={submitting || currentUserRole !== "administrateur"}
                        >
                          <Trash2 size={14} strokeWidth={2} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>
    </section>
  );
}

export default UsersPage;
