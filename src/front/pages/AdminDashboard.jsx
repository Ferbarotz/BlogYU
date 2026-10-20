import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { API_BASE, authHeaders } from "../api/backend";

const ROLES = ["user", "editor", "moderator", "admin"];

export default function AdminDashboard() {
  const navigate = useNavigate();
  const user = (() => {
    try { return JSON.parse(localStorage.getItem("user") || "null"); } catch { return null; }
  })();

  const [activeTab, setActiveTab] = useState("overview");
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);

  const [users, setUsers] = useState([]);
  const [usersMeta, setUsersMeta] = useState({ page: 1, pages: 1, total: 0 });
  const [usersQuery, setUsersQuery] = useState("");

  const [posts, setPosts] = useState([]);
  const [postsMeta, setPostsMeta] = useState({ page: 1, pages: 1, total: 0 });
  const [postsQuery, setPostsQuery] = useState("");

  const [routes, setRoutes] = useState([]);
  const [routesMeta, setRoutesMeta] = useState({ page: 1, pages: 1, total: 0 });

  const isAdmin = !!(user && (user.is_admin || user.role === "admin" || user.role === "superuser"));

  useEffect(() => {
    if (!isAdmin) {
      navigate("/");
      return;
    }
    fetchOverview();
    fetchUsers(1, "");
    fetchPosts(1, "");
    fetchRoutes(1);
  }, []);

  const fetchOverview = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/admin/stats`, { headers: authHeaders() });
      if (res.ok) setStats(await res.json());
    } catch (e) {
      console.error("Error stats", e);
    }
  };

  const fetchUsers = async (page = 1, q = usersQuery) => {
    try {
      const params = new URLSearchParams({ page: String(page), per_page: "10" });
      if (q.trim()) params.set("q", q.trim());
      const res = await fetch(`${API_BASE}/api/admin/users?${params.toString()}`, { headers: authHeaders() });
      if (!res.ok) return;
      const data = await res.json();
      setUsers(data.items || []);
      setUsersMeta({ page: data.page || 1, pages: data.pages || 1, total: data.total || 0 });
    } catch (e) {
      console.error("Error users", e);
    }
  };

  const fetchPosts = async (page = 1, q = postsQuery) => {
    try {
      const params = new URLSearchParams({ page: String(page), per_page: "10" });
      if (q.trim()) params.set("q", q.trim());
      const res = await fetch(`${API_BASE}/api/admin/posts?${params.toString()}`, { headers: authHeaders() });
      if (!res.ok) return;
      const data = await res.json();
      setPosts(data.items || []);
      setPostsMeta({ page: data.page || 1, pages: data.pages || 1, total: data.total || 0 });
    } catch (e) {
      console.error("Error posts", e);
    }
  };

  const fetchRoutes = async (page = 1) => {
    try {
      const res = await fetch(`${API_BASE}/api/admin/routes?page=${page}&per_page=10`, { headers: authHeaders() });
      if (!res.ok) return;
      const data = await res.json();
      setRoutes(data.items || []);
      setRoutesMeta({ page: data.page || 1, pages: data.pages || 1, total: data.total || 0 });
    } catch (e) {
      console.error("Error routes", e);
    } finally {
      setLoading(false);
    }
  };

  const updateUserRoleOrStatus = async (u, payload) => {
    try {
      const res = await fetch(`${API_BASE}/api/admin/users/${u.id}`, {
        method: "PATCH",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) return;
      fetchUsers(usersMeta.page);
      fetchOverview();
    } catch (e) {
      console.error("Error update user", e);
    }
  };

  const deletePost = async (postId) => {
    if (!window.confirm("¿Eliminar publicación?")) return;
    try {
      const res = await fetch(`${API_BASE}/api/admin/posts/${postId}`, { method: "DELETE", headers: authHeaders() });
      if (res.ok) {
        fetchPosts(postsMeta.page);
        fetchOverview();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const togglePostVisibility = async (post) => {
    try {
      const res = await fetch(`${API_BASE}/api/admin/posts/${post.id}/visibility`, {
        method: "PATCH",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ is_hidden: !post.is_hidden }),
      });
      if (res.ok) {
        fetchPosts(postsMeta.page);
        fetchOverview();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const deleteRoute = async (routeId) => {
    if (!window.confirm("¿Eliminar ruta?")) return;
    try {
      const res = await fetch(`${API_BASE}/api/admin/routes/${routeId}`, { method: "DELETE", headers: authHeaders() });
      if (res.ok) {
        fetchRoutes(routesMeta.page);
        fetchOverview();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const pager = (meta, onPage) => (
    <div className="d-flex align-items-center gap-2 mt-3">
      <button className="btn btn-sm btn-outline-light" disabled={meta.page <= 1} onClick={() => onPage(meta.page - 1)}>Anterior</button>
      <span style={{ color: "rgba(255,255,255,0.6)", fontSize: "0.85rem" }}>Página {meta.page} de {meta.pages}</span>
      <button className="btn btn-sm btn-outline-light" disabled={meta.page >= meta.pages} onClick={() => onPage(meta.page + 1)}>Siguiente</button>
    </div>
  );

  if (loading && !stats) {
    return <div style={{ minHeight: "80vh", display: "grid", placeItems: "center", background: "#0d1117", color: "#00f2fe" }}>Cargando panel...</div>;
  }

  return (
    <div style={{ background: "#0d1117", minHeight: "100vh", color: "#fff", paddingBottom: 40 }}>
      <div style={{ background: "linear-gradient(135deg,#0f2027 0%,#203a43 50%,#2c5364 100%)", padding: "36px 20px" }}>
        <div className="container" style={{ maxWidth: 1200 }}>
          <p style={{ color: "#f9d423", letterSpacing: 3, fontSize: "0.7rem", textTransform: "uppercase", marginBottom: 8 }}>🛡️ Acceso restringido</p>
          <h1 className="fw-black mb-0">Panel de Administración</h1>
        </div>
      </div>

      <div className="container py-4" style={{ maxWidth: 1200 }}>
        <div className="d-flex gap-2 flex-wrap mb-4">
          {[
            ["overview", "📊 Resumen"],
            ["users", "👥 Usuarios"],
            ["posts", "📝 Posts"],
            ["routes", "🗺️ Rutas"],
          ].map(([key, label]) => (
            <button
              key={key}
              className="btn btn-sm"
              onClick={() => setActiveTab(key)}
              style={{
                background: activeTab === key ? "linear-gradient(135deg,#00f2fe,#4facfe)" : "rgba(255,255,255,0.08)",
                color: activeTab === key ? "#000" : "#fff",
                border: "1px solid rgba(255,255,255,0.18)",
                borderRadius: 999,
                fontWeight: 700,
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {activeTab === "overview" && stats && (
          <>
            <div className="row g-3 mb-4">
              {[
                ["Usuarios", stats.users, "👥"],
                ["Posts", stats.posts, "📝"],
                ["Comentarios", stats.comments, "💬"],
                ["Likes", stats.likes, "💛"],
                ["Visitas", stats.views, "👁️"],
                ["Ocultos", stats.hidden, "🙈"],
                ["Borradores", stats.drafts, "📄"],
                ["Rutas", stats.routes, "🗺️"],
              ].map(([label, val, icon]) => (
                <div className="col-6 col-md-3" key={label}>
                  <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, padding: 14 }}>
                    <div style={{ fontSize: "1.2rem" }}>{icon}</div>
                    <div style={{ fontSize: "1.5rem", fontWeight: 800 }}>{val ?? 0}</div>
                    <div style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.8rem" }}>{label}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="row g-3">
              <div className="col-md-6">
                <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, padding: 16 }}>
                  <h5 style={{ color: "#00f2fe" }}>Posts por categoría</h5>
                  {(stats.posts_by_category || []).map((c) => (
                    <div key={c.category} className="d-flex justify-content-between" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", padding: "6px 0" }}>
                      <span>{c.category || "sin_categoria"}</span><strong>{c.count}</strong>
                    </div>
                  ))}
                </div>
              </div>
              <div className="col-md-6">
                <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, padding: 16 }}>
                  <h5 style={{ color: "#00f2fe" }}>Últimos usuarios</h5>
                  {(stats.latest_users || []).map((u) => (
                    <div key={u.id} className="d-flex justify-content-between" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", padding: "6px 0" }}>
                      <span>{u.name}</span><small>{u.role} · {u.is_active ? "activo" : "inactivo"}</small>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}

        {activeTab === "users" && (
          <>
            <div className="d-flex gap-2 mb-3">
              <input className="form-control" value={usersQuery} onChange={(e) => setUsersQuery(e.target.value)} placeholder="Buscar por nombre, email o rol" style={{ background: "rgba(255,255,255,0.05)", color: "#fff", border: "1px solid rgba(255,255,255,0.12)" }} />
              <button className="btn btn-info" onClick={() => fetchUsers(1, usersQuery)}>Buscar</button>
            </div>

            <div className="table-responsive">
              <table className="table table-dark table-striped align-middle">
                <thead><tr><th>Usuario</th><th>Email</th><th>Rol</th><th>Estado</th><th>Acciones</th></tr></thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id}>
                      <td>{u.name}</td>
                      <td>{u.email}</td>
                      <td>
                        <select
                          className="form-select form-select-sm"
                          value={u.role || (u.is_admin ? "admin" : "user")}
                          onChange={(e) => updateUserRoleOrStatus(u, { role: e.target.value })}
                        >
                          {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                        </select>
                      </td>
                      <td>{u.is_active ? "Activo" : "Inactivo"}</td>
                      <td>
                        <button className="btn btn-sm btn-outline-warning" onClick={() => updateUserRoleOrStatus(u, { is_active: !u.is_active })}>
                          {u.is_active ? "Desactivar" : "Activar"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {pager(usersMeta, (p) => fetchUsers(p, usersQuery))}
          </>
        )}

        {activeTab === "posts" && (
          <>
            <div className="d-flex gap-2 mb-3">
              <input className="form-control" value={postsQuery} onChange={(e) => setPostsQuery(e.target.value)} placeholder="Buscar posts" style={{ background: "rgba(255,255,255,0.05)", color: "#fff", border: "1px solid rgba(255,255,255,0.12)" }} />
              <button className="btn btn-info" onClick={() => fetchPosts(1, postsQuery)}>Buscar</button>
            </div>

            <div className="table-responsive">
              <table className="table table-dark table-striped align-middle">
                <thead><tr><th>Título</th><th>Autor</th><th>Estado</th><th>Visitas</th><th>Likes</th><th>Acciones</th></tr></thead>
                <tbody>
                  {posts.map((p) => (
                    <tr key={p.id}>
                      <td>{p.title}</td>
                      <td>{p.author?.name || "Anónimo"}</td>
                      <td>{p.status}{p.is_hidden ? " · oculto" : ""}</td>
                      <td>{p.views || 0}</td>
                      <td>{p.like_count || 0}</td>
                      <td className="d-flex gap-1">
                        <button className="btn btn-sm btn-outline-warning" onClick={() => togglePostVisibility(p)}>{p.is_hidden ? "Mostrar" : "Ocultar"}</button>
                        <button className="btn btn-sm btn-outline-danger" onClick={() => deletePost(p.id)}>Eliminar</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {pager(postsMeta, (p) => fetchPosts(p, postsQuery))}
          </>
        )}

        {activeTab === "routes" && (
          <>
            <div className="table-responsive">
              <table className="table table-dark table-striped align-middle">
                <thead><tr><th>Título</th><th>Destino</th><th>Autor</th><th>Acciones</th></tr></thead>
                <tbody>
                  {routes.map((r) => (
                    <tr key={r.id}>
                      <td>{r.title}</td>
                      <td>{r.destination}</td>
                      <td>{r.author?.name || "Anónimo"}</td>
                      <td><button className="btn btn-sm btn-outline-danger" onClick={() => deleteRoute(r.id)}>Eliminar</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {pager(routesMeta, (p) => fetchRoutes(p))}
          </>
        )}
      </div>

      <style>{`body { background: #0d1117 !important; }`}</style>
    </div>
  );
}
