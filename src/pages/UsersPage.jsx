import { useEffect, useState } from "react";
import JsonCrudSection from "../components/JsonCrudSection.jsx";
import { useAuth } from "../contexts/auth-context.js";
import {
  createUser,
  deleteUser,
  getUsers,
  updateUser,
} from "../api/users.js";

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

function UsersPage() {
  const { role: currentUserRole } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

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

  useEffect(() => {
    fetchUsers();
  }, []);

  return (
    <section className="panel panel-wide">
      <p className="eyebrow">Utilisateurs</p>
      <h2>Gestion des utilisateurs</h2>

      <div className="list-grid">
        {users.map((user) => (
          <article key={user.id} className="list-card">
            <p className="eyebrow">#{user.id}</p>
            <h3>{user.name}</h3>
            <p>{user.email}</p>
            <p>Role : {user.role || "Aucun role"}</p>
            <p>Projets : {user.projects.length}</p>
          </article>
        ))}
      </div>

      <JsonCrudSection
        title="Utilisateurs"
        records={users}
        loading={loading}
        errorMessage={errorMessage}
        onRefresh={fetchUsers}
        onCreate={createUser}
        onUpdate={updateUser}
        onDelete={deleteUser}
        createTemplate={{
          nom_complet: "",
          email: "",
          password: "",
          role: "agent terrain",
          code_acces: "",
          projects: [],
        }}
        canManage={currentUserRole === "administrateur"}
        getRecordLabel={(record) => `${record.name} (${record.email})`}
      />
    </section>
  );
}

export default UsersPage;
