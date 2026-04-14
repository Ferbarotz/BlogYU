import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { API_BASE, authHeaders } from "../api/backend";

/**
 * AdminDashboard.jsx
 * - Búsqueda global + por pestañas
 * - Paginación para usuarios, posts y rutas
 * - Modal de confirmación personalizado (reemplaza window.confirm)
 *
 * Guarda este archivo en: src/front/pages/AdminDashboard.jsx
 */

export default function AdminDashboard() {
  const ITEMS_PER_PAGE = 10;

  const [stats, setStats] = useState({ users: 0, posts: 0, routes: 0 });
  const [users, setUsers] = useState([]);
  const [posts, setPosts] = useState([]);
  const [routes, setRoutes] = useState([]);

  const [activeTab, setActiveTab] = useState("overview");
  const [loading, setLoading] = useState(true);

  // buscadores
  const [searchTerm, setSearchTerm] = useState("");
  const [globalSearchTerm, setGlobalSearchTerm] = useState("");

  // paginación (separada para vista por pestañas y para resultados globales)
  const [usersPage, setUsersPage] = useState(1);
  const [postsPage, setPostsPage] = useState(1);
  const [routesPage, setRoutesPage] = useState(1);

  const [globalUsersPage, setGlobalUsersPage] = useState(1);
  const [globalPostsPage, setGlobalPostsPage] = useState(1);
  const [globalRoutesPage, setGlobalRoutesPage] = useState(1);

  const navigate = useNavigate();
  const user = (() => {
    const raw = localStorage.getItem("user");
    if (!raw || raw === "undefined" || raw === "null") return null;
    try { return JSON.parse(raw); } catch { return null; }
  })();

  // Estado del modal de confirmación
  const [confirmModal, setConfirmModal] = useState({
    visible: false,
    message: "",
    onConfirm: null,
  });

  // datos del ítem pendiente (tipo + id) para referencia si es necesario
  const [pendingDelete, setPendingDelete] = useState({ type: null, id: null });

 // Y reemplaza la condición del useEffect:
useEffect(() => {
  const isAdmin = !!(
    user && (
      user.is_admin === true ||
      user.is_admin === "true" ||
      user.role === "admin" ||
      user.role === "superuser"
    )
  );
  if (!isAdmin) {
    navigate("/");
    return;
  }
  fetchAll();
}, []);

  // Reset de páginas cuando cambian los buscadores o pestaña
  useEffect(() => setUsersPage(1), [searchTerm, activeTab]);
  useEffect(() => setPostsPage(1), [searchTerm, activeTab]);
  useEffect(() => setRoutesPage(1), [searchTerm, activeTab]);

  useEffect(() => setGlobalUsersPage(1), [globalSearchTerm]);
  useEffect(() => setGlobalPostsPage(1), [globalSearchTerm]);
  useEffect(() => setGlobalRoutesPage(1), [globalSearchTerm]);

  // Util: ajustar la página si quedó fuera de rango luego de una eliminación
  const ensurePageInRange = (length, pageSetter, currentPage) => {
    const totalPages = Math.max(1, Math.ceil(length / ITEMS_PER_PAGE));
    if (currentPage > totalPages) pageSetter(totalPages);
    if (currentPage < 1) pageSetter(1);
  };

  // FILTROS INDIVIDUALES (por pestaña)
  const filteredUsers = users.filter(
    (u) =>
      (u.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.email || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredPosts = posts.filter(
    (p) =>
      (p.title || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      ((p.author?.name || "anónimo").toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const filteredRoutes = routes.filter(
    (r) =>
      (r.title || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (r.destination || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      ((r.author?.name || "").toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // FILTROS GLOBALES (fuera de pestañas) - incluye búsqueda por autor en rutas también
  const globalFilteredUsers = users.filter(
    (u) =>
      (u.name || "").toLowerCase().includes(globalSearchTerm.toLowerCase()) ||
      (u.email || "").toLowerCase().includes(globalSearchTerm.toLowerCase())
  );

  const globalFilteredPosts = posts.filter(
    (p) =>
      (p.title || "").toLowerCase().includes(globalSearchTerm.toLowerCase()) ||
      ((p.author?.name || "anónimo").toLowerCase().includes(globalSearchTerm.toLowerCase()))
  );

  const globalFilteredRoutes = routes.filter(
    (r) =>
      (r.title || "").toLowerCase().includes(globalSearchTerm.toLowerCase()) ||
      (r.destination || "").toLowerCase().includes(globalSearchTerm.toLowerCase()) ||
      ((r.author?.name || "").toLowerCase().includes(globalSearchTerm.toLowerCase()))
  );

  // PAGINACIÓN: calcular subconjuntos a mostrar
  const pagedUsers = filteredUsers.slice(
    (usersPage - 1) * ITEMS_PER_PAGE,
    usersPage * ITEMS_PER_PAGE
  );
  const totalUsersPages = Math.max(1, Math.ceil(filteredUsers.length / ITEMS_PER_PAGE));

  const pagedPosts = filteredPosts.slice(
    (postsPage - 1) * ITEMS_PER_PAGE,
    postsPage * ITEMS_PER_PAGE
  );
  const totalPostsPages = Math.max(1, Math.ceil(filteredPosts.length / ITEMS_PER_PAGE));

  const pagedRoutes = filteredRoutes.slice(
    (routesPage - 1) * ITEMS_PER_PAGE,
    routesPage * ITEMS_PER_PAGE
  );
  const totalRoutesPages = Math.max(1, Math.ceil(filteredRoutes.length / ITEMS_PER_PAGE));

  // Global paged
  const pagedGlobalUsers = globalFilteredUsers.slice(
    (globalUsersPage - 1) * ITEMS_PER_PAGE,
    globalUsersPage * ITEMS_PER_PAGE
  );
  const totalGlobalUsersPages = Math.max(1, Math.ceil(globalFilteredUsers.length / ITEMS_PER_PAGE));

  const pagedGlobalPosts = globalFilteredPosts.slice(
    (globalPostsPage - 1) * ITEMS_PER_PAGE,
    globalPostsPage * ITEMS_PER_PAGE
  );
  const totalGlobalPostsPages = Math.max(1, Math.ceil(globalFilteredPosts.length / ITEMS_PER_PAGE));

  const pagedGlobalRoutes = globalFilteredRoutes.slice(
    (globalRoutesPage - 1) * ITEMS_PER_PAGE,
    globalRoutesPage * ITEMS_PER_PAGE
  );
  const totalGlobalRoutesPages = Math.max(1, Math.ceil(globalFilteredRoutes.length / ITEMS_PER_PAGE));

  // FETCH
  const fetchAll = async () => {
    setLoading(true);
    try {
      const [usersRes, postsRes, routesRes] = await Promise.all([
        fetch(`${API_BASE}/api/admin/users`, { headers: authHeaders() }),
        fetch(`${API_BASE}/api/posts`, { headers: authHeaders() }),
        fetch(`${API_BASE}/api/routes`, { headers: authHeaders() }),
      ]);
      const usersList = usersRes.ok ? await usersRes.json() : [];
      const postsList = postsRes.ok ? await postsRes.json() : [];
      const routesList = routesRes.ok ? await routesRes.json() : [];
      setUsers(Array.isArray(usersList) ? usersList : []);
      setPosts(Array.isArray(postsList) ? postsList : []);
      setRoutes(Array.isArray(routesList) ? routesList : []);
      setStats({
        users: Array.isArray(usersList) ? usersList.length : 0,
        posts: Array.isArray(postsList) ? postsList.length : 0,
        routes: Array.isArray(routesList) ? routesList.length : 0,
      });
    } catch (err) {
      console.error("Error cargando datos admin:", err);
    } finally {
      setLoading(false);
    }
  };

  // ---------- Modal confirm helpers ----------
  const openConfirmModal = (message, onConfirm, pending = { type: null, id: null }) => {
    setPendingDelete(pending);
    setConfirmModal({ visible: true, message, onConfirm });
  };

  const closeConfirmModal = () => {
    setPendingDelete({ type: null, id: null });
    setConfirmModal({ visible: false, message: "", onConfirm: null });
  };

  // ---------- Eliminaciones (no usan window.confirm) ----------
  // Cada método realiza la petición, actualiza el state local y ajusta paginación.
  const deleteUserConfirmed = async (id) => {
    try {
      const resp = await fetch(`${API_BASE}/api/admin/users/${id}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      if (resp.ok) {
        const newUsers = users.filter((u) => u.id !== id);
        setUsers(newUsers);
        setStats((s) => ({ ...s, users: Math.max(0, s.users - 1) }));

        // Ajustar páginas relacionadas
        ensurePageInRange(newUsers.length, setUsersPage, usersPage);
        ensurePageInRange(newUsers.length, setGlobalUsersPage, globalUsersPage);
      } else {
        const err = await resp.json().catch(() => ({}));
        alert(err.msg || "Error al eliminar usuario");
      }
    } catch (err) {
      console.error(err);
      alert("Error al eliminar usuario");
    } finally {
      closeConfirmModal();
    }
  };

  const deletePostConfirmed = async (id) => {
    try {
      const res = await fetch(`${API_BASE}/api/posts/${id}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      if (res.ok) {
        const newPosts = posts.filter((p) => p.id !== id);
        setPosts(newPosts);
        setStats((s) => ({ ...s, posts: Math.max(0, s.posts - 1) }));

        ensurePageInRange(newPosts.length, setPostsPage, postsPage);
        ensurePageInRange(newPosts.length, setGlobalPostsPage, globalPostsPage);
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err.msg || "Error al eliminar post");
      }
    } catch (err) {
      console.error(err);
      alert("Error al eliminar post");
    } finally {
      closeConfirmModal();
    }
  };

  const deleteRouteConfirmed = async (id) => {
    try {
      const res = await fetch(`${API_BASE}/api/routes/${id}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      if (res.ok) {
        const newRoutes = routes.filter((r) => r.id !== id);
        setRoutes(newRoutes);
        setStats((s) => ({ ...s, routes: Math.max(0, s.routes - 1) }));

        ensurePageInRange(newRoutes.length, setRoutesPage, routesPage);
        ensurePageInRange(newRoutes.length, setGlobalRoutesPage, globalRoutesPage);
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err.msg || "Error al eliminar ruta");
      }
    } catch (err) {
      console.error(err);
      alert("Error al eliminar ruta");
    } finally {
      closeConfirmModal();
    }
  };

  // Toggle admin (no modal) - kept as before
  const handleToggleAdmin = async (u) => {
    try {
      const res = await fetch(`${API_BASE}/api/admin/users/${u.id}`, {
        method: "PUT",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ is_admin: !u.is_admin }),
      });
      if (res.ok) {
        setUsers((prev) => prev.map((usr) => (usr.id === u.id ? { ...usr, is_admin: !usr.is_admin } : usr)));
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err.msg || "Error al cambiar rol");
      }
    } catch (err) {
      console.error(err);
      alert("Error al cambiar rol");
    }
  };

  // Styles
  const th = {
    padding: "10px 14px",
    color: "rgba(255,255,255,0.4)",
    fontSize: "0.7rem",
    textTransform: "uppercase",
    letterSpacing: "1px",
    textAlign: "left",
    borderBottom: "1px solid rgba(255,255,255,0.12)",
  };
  const td = {
    padding: "13px 14px",
    color: "rgba(255,255,255,0.85)",
    fontSize: "0.84rem",
    borderBottom: "1px solid rgba(255,255,255,0.05)",
    verticalAlign: "middle",
  };
  const tabBtn = (id) => ({
    background:
      activeTab === id ? "linear-gradient(135deg,#00f2fe,#4facfe)" : "rgba(255,255,255,0.04)",
    border: activeTab === id ? "none" : "1px solid rgba(255,255,255,0.1)",
    color: activeTab === id ? "#000" : "rgba(255,255,255,0.6)",
    borderRadius: "8px",
    padding: "8px 20px",
    fontWeight: "700",
    fontSize: "0.8rem",
    cursor: "pointer",
    transition: "all 0.3s",
  });

  if (loading)
    return (
      <div style={{ minHeight: "80vh", background: "#0d1117", display: "grid", placeItems: "center" }}>
        <div className="text-center">
          <div className="spinner-border mb-3" style={{ color: "#00f2fe", width: "3rem", height: "3rem" }} />
          <p style={{ color: "#00f2fe", letterSpacing: "3px", fontSize: "0.8rem" }}>CARGANDO PANEL...</p>
        </div>
      </div>
    );

  // Helper render para controles de paginación (UI simple)
  const renderPagination = (currentPage, setPage, totalPages) => {
    if (totalPages <= 1) return null;
    const pages = [];
    const start = Math.max(1, currentPage - 2);
    const end = Math.min(totalPages, start + 4);
    for (let i = start; i <= end; i++) pages.push(i);

    return (
      <div style={{ marginTop: 12, display: "flex", gap: 8, justifyContent: "center", alignItems: "center" }}>
        <button
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={currentPage === 1}
          style={{ opacity: currentPage === 1 ? 0.4 : 1, cursor: currentPage === 1 ? "not-allowed" : "pointer" }}
        >
          ← Anterior
        </button>
        {start > 1 && <span style={{ opacity: 0.6 }}>...</span>}
        {pages.map((p) => (
          <button
            key={p}
            onClick={() => setPage(p)}
            style={{
              fontWeight: currentPage === p ? "800" : "600",
              padding: "6px 10px",
              borderRadius: 6,
              background: currentPage === p ? "rgba(0,242,254,0.12)" : "transparent",
              border: "1px solid rgba(255,255,255,0.04)",
              cursor: "pointer",
            }}
          >
            {p}
          </button>
        ))}
        {end < totalPages && <span style={{ opacity: 0.6 }}>...</span>}
        <button
          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          disabled={currentPage === totalPages}
          style={{ opacity: currentPage === totalPages ? 0.4 : 1, cursor: currentPage === totalPages ? "not-allowed" : "pointer" }}
        >
          Siguiente →
        </button>
      </div>
    );
  };

  // Confirm modal component (reusable)
  function ConfirmModal({ visible, message, onConfirm, onCancel }) {
    if (!visible) return null;
    return (
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(2,6,23,0.65)",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          zIndex: 9999,
          padding: 16,
        }}
        onMouseDown={onCancel}
      >
        <div
          onMouseDown={(e) => e.stopPropagation()}
          style={{
            background: "#0b1220",
            padding: 22,
            borderRadius: 12,
            maxWidth: 520,
            width: "100%",
            color: "#fff",
            textAlign: "left",
            boxShadow: "0 10px 30px rgba(0,0,0,0.6)",
            border: "1px solid rgba(255,255,255,0.03)",
          }}
        >
          <h4 style={{ marginTop: 0, color: "#00f2fe" }}>Confirmar acción</h4>
          <p style={{ color: "rgba(255,255,255,0.85)", marginBottom: 20 }}>{message}</p>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
            <button
              onClick={onCancel}
              style={{
                background: "#11161b",
                color: "#fff",
                border: "1px solid rgba(255,255,255,0.04)",
                padding: "8px 14px",
                borderRadius: 8,
                cursor: "pointer",
              }}
            >
              Cancelar
            </button>

            <button
              onClick={onConfirm}
              style={{
                background: "linear-gradient(135deg,#ff4e50,#00f2fe)",
                color: "#000",
                border: "none",
                padding: "8px 14px",
                borderRadius: 8,
                cursor: "pointer",
                fontWeight: 700,
              }}
            >
              Confirmar
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Render
  return (
    <div style={{ background: "#0d1117", minHeight: "100vh", paddingBottom: "60px" }}>
      {/* HEADER */}
      <div style={{ background: "linear-gradient(135deg,#0f2027 0%,#203a43 50%,#2c5364 100%)", padding: "40px 20px 30px", position: "relative" }}>
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "4px", background: "linear-gradient(to right,#f9d423,#ff4e50,#00f2fe)" }} />
        <div className="container" style={{ maxWidth: "1200px" }}>
          <p style={{ color: "#f9d423", letterSpacing: "3px", fontSize: "0.7rem", textTransform: "uppercase", marginBottom: "6px" }}>🛡️ Acceso Restringido</p>
          <h1 className="fw-black text-white mb-1" style={{ fontSize: "2rem" }}>
            Panel de <span style={{ background: "linear-gradient(135deg,#f9d423,#ff4e50)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Administración</span>
          </h1>
          <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.85rem", marginBottom: "24px" }}>
            Bienvenido, <strong style={{ color: "#00f2fe" }}>{user?.name}</strong> — gestiona usuarios, contenido y configuración del sitio.
          </p>
          <div className="row g-3">
            {[
              { label: "Usuarios", value: stats.users, icon: "👥", color: "#00f2fe" },
              { label: "Posts", value: stats.posts, icon: "📝", color: "#f9d423" },
              { label: "Rutas", value: stats.routes, icon: "🗺️", color: "#ff4e50" },
            ].map((s) => (
              <div className="col-6 col-md-3" key={s.label}>
                <div style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "12px", padding: "16px 20px" }}>
                  <div style={{ fontSize: "1.6rem", marginBottom: "4px" }}>{s.icon}</div>
                  <div style={{ fontSize: "1.8rem", fontWeight: "900", color: s.color }}>{s.value}</div>
                  <div style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.4)", letterSpacing: "1px", textTransform: "uppercase" }}>{s.label}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Buscador global */}
      <div className="container mt-4" style={{ maxWidth: "1200px" }}>
        <div style={{ marginBottom: 24 }}>
          <input
            type="text"
            placeholder="Buscar en usuarios, posts y rutas..."
            value={globalSearchTerm}
            onChange={(e) => setGlobalSearchTerm(e.target.value)}
            style={{
              width: "100%",
              maxWidth: 600,
              padding: "10px 14px",
              borderRadius: 8,
              border: "1px solid rgba(255,255,255,0.3)",
              background: "#0d1117",
              color: "#fff",
              fontSize: "1rem",
            }}
          />
        </div>

        {globalSearchTerm ? (
          <>
            <h4 style={{ color: "#00f2fe", marginBottom: 12 }}>Resultados de búsqueda global</h4>

            {/* USUARIOS GLOBALES */}
            <h5 style={{ color: "#fff", marginTop: 20 }}>👥 Usuarios ({globalFilteredUsers.length})</h5>
            {pagedGlobalUsers.length > 0 ? (
              <>
                <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 12 }}>
                  <thead>
                    <tr>
                      <th style={th}>#</th>
                      <th style={th}>Nombre</th>
                      <th style={th}>Email</th>
                      <th style={th}>Rol</th>
                      <th style={th}>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pagedGlobalUsers.map((u, i) => (
                      <tr key={u.id} style={{ background: "rgba(255,255,255,0.02)" }}>
                        <td style={td}>{(globalUsersPage - 1) * ITEMS_PER_PAGE + i + 1}</td>
                        <td style={td}>{u.name}</td>
                        <td style={{ ...td, color: "rgba(255,255,255,0.5)" }}>{u.email}</td>
                        <td style={td}>{u.is_admin ? "Admin" : "Usuario"}</td>
                        <td style={td}>
                          <div style={{ display: "flex", gap: 8 }}>
                            <button onClick={() => handleToggleAdmin(u)} style={{ background: "rgba(249,212,35,0.1)", color: "#f9d423", border: "1px solid rgba(249,212,35,0.3)", borderRadius: "6px", padding: "4px 10px", fontSize: "0.8rem", cursor: "pointer" }}>
                              {u.is_admin ? "Quitar Admin" : "Hacer Admin"}
                            </button>
                            <button
                              onClick={() =>
                                openConfirmModal(
                                  `¿Eliminar al usuario "${u.name}"? Esta acción no se puede deshacer.`,
                                  () => deleteUserConfirmed(u.id),
                                  { type: "user", id: u.id }
                                )
                              }
                              style={{ background: "rgba(220,53,69,0.1)", color: "#ff6b7a", border: "1px solid rgba(220,53,69,0.3)", borderRadius: "6px", padding: "4px 10px", fontSize: "0.8rem", cursor: "pointer" }}
                            >
                              🗑️ Eliminar
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {renderPagination(globalUsersPage, setGlobalUsersPage, totalGlobalUsersPages)}
              </>
            ) : (
              <p style={{ color: "rgba(255,255,255,0.3)" }}>No se encontraron usuarios.</p>
            )}

            {/* POSTS GLOBALES */}
            <h5 style={{ color: "#fff", marginTop: 20 }}>📝 Posts ({globalFilteredPosts.length})</h5>
            {pagedGlobalPosts.length > 0 ? (
              <>
                <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 12 }}>
                  <thead>
                    <tr>
                      <th style={th}>#</th>
                      <th style={th}>Título</th>
                      <th style={th}>Autor</th>
                      <th style={th}>Categoría</th>
                      <th style={th}>Fecha</th>
                      <th style={th}>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pagedGlobalPosts.map((p, i) => (
                      <tr key={p.id} style={{ background: "rgba(255,255,255,0.02)" }}>
                        <td style={td}>{(globalPostsPage - 1) * ITEMS_PER_PAGE + i + 1}</td>
                        <td style={td}>{p.title}</td>
                        <td style={{ ...td, color: "rgba(255,255,255,0.55)" }}>{p.author?.name || "Anónimo"}</td>
                        <td style={td}>{p.category || "—"}</td>
                        <td style={{ ...td, color: "rgba(255,255,255,0.4)" }}>{p.created_at ? new Date(p.created_at).toLocaleDateString() : "—"}</td>
                        <td style={td}>
                          <button
                            onClick={() =>
                              openConfirmModal(
                                `¿Eliminar el post "${p.title}"? Esta acción no se puede deshacer.`,
                                () => deletePostConfirmed(p.id),
                                { type: "post", id: p.id }
                              )
                            }
                            style={{ background: "rgba(220,53,69,0.1)", color: "#ff6b7a", border: "1px solid rgba(220,53,69,0.3)", borderRadius: "6px", padding: "4px 10px", fontSize: "0.8rem", cursor: "pointer" }}
                          >
                            🗑️ Eliminar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {renderPagination(globalPostsPage, setGlobalPostsPage, totalGlobalPostsPages)}
              </>
            ) : (
              <p style={{ color: "rgba(255,255,255,0.3)" }}>No se encontraron posts.</p>
            )}

            {/* RUTAS GLOBALES */}
            <h5 style={{ color: "#fff", marginTop: 20 }}>🗺️ Rutas ({globalFilteredRoutes.length})</h5>
            {pagedGlobalRoutes.length > 0 ? (
              <>
                <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 12 }}>
                  <thead>
                    <tr>
                      <th style={th}>#</th>
                      <th style={th}>Título</th>
                      <th style={th}>Destino</th>
                      <th style={th}>Autor</th>
                      <th style={th}>Paradas</th>
                      <th style={th}>Fecha</th>
                      <th style={th}>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pagedGlobalRoutes.map((r, i) => (
                      <tr key={r.id} style={{ background: "rgba(255,255,255,0.02)" }}>
                        <td style={td}>{(globalRoutesPage - 1) * ITEMS_PER_PAGE + i + 1}</td>
                        <td style={td}>{r.title}</td>
                        <td style={{ ...td, color: "rgba(255,255,255,0.55)" }}>{r.destination}</td>
                        <td style={{ ...td, color: "rgba(255,255,255,0.55)" }}>{r.author?.name || "Anónimo"}</td>
                        <td style={td}>{r.steps?.length || 0}</td>
                        <td style={{ ...td, color: "rgba(255,255,255,0.4)" }}>{r.created_at ? new Date(r.created_at).toLocaleDateString() : "—"}</td>
                        <td style={td}>
                          <button
                            onClick={() =>
                              openConfirmModal(
                                `¿Eliminar la ruta "${r.title}"? Esta acción no se puede deshacer.`,
                                () => deleteRouteConfirmed(r.id),
                                { type: "route", id: r.id }
                              )
                            }
                            style={{ background: "rgba(220,53,69,0.1)", color: "#ff6b7a", border: "1px solid rgba(220,53,69,0.3)", borderRadius: "6px", padding: "4px 10px", fontSize: "0.8rem", cursor: "pointer" }}
                          >
                            🗑️ Eliminar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {renderPagination(globalRoutesPage, setGlobalRoutesPage, totalGlobalRoutesPages)}
              </>
            ) : (
              <p style={{ color: "rgba(255,255,255,0.3)" }}>No se encontraron rutas.</p>
            )}
          </>
        ) : (
          <>
            {/* Pestañas y buscadores individuales */}
            <div className="d-flex gap-2 flex-wrap mb-4">
              {[
                { id: "overview", label: "📊 Resumen" },
                { id: "users", label: "👥 Usuarios" },
                { id: "posts", label: "📝 Posts" },
                { id: "routes", label: "🗺️ Rutas" },
              ].map((t) => (
                <button key={t.id} style={tabBtn(t.id)} onClick={() => { setActiveTab(t.id); setSearchTerm(""); }}>
                  {t.label}
                </button>
              ))}
            </div>

            {/* OVERVIEW */}
            {activeTab === "overview" && (
              <div className="row g-4">
                {[
                  { title: "Gestionar Usuarios", desc: "Ver, editar roles y eliminar usuarios.", icon: "👥", tab: "users", color: "#00f2fe" },
                  { title: "Moderar Posts", desc: "Revisar y eliminar publicaciones.", icon: "📝", tab: "posts", color: "#f9d423" },
                  { title: "Moderar Rutas", desc: "Revisar y eliminar rutas de viaje.", icon: "🗺️", tab: "routes", color: "#ff4e50" },
                ].map(card => (
                  <div className="col-md-4" key={card.tab}>
                    <div onClick={() => { setActiveTab(card.tab); setSearchTerm(""); }} style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "16px", padding: "28px 24px", cursor: "pointer" }}>
                      <div style={{ fontSize: "2.5rem", marginBottom: "12px" }}>{card.icon}</div>
                      <h5 style={{ color: card.color, fontWeight: "800", marginBottom: "8px" }}>{card.title}</h5>
                      <p style={{ color: "rgba(255,255,255,0.45)", fontSize: "0.85rem", margin: 0 }}>{card.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* USUARIOS */}
            {activeTab === "users" && (
              <>
                <div style={{ marginBottom: 16 }}>
                  <input
                    type="text"
                    placeholder="Buscar usuarios por nombre o email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{
                      width: "100%",
                      maxWidth: 400,
                      padding: "8px 12px",
                      borderRadius: 6,
                      border: "1px solid rgba(255,255,255,0.2)",
                      background: "#0d1117",
                      color: "#fff",
                      fontSize: "0.9rem",
                    }}
                  />
                </div>

                <div style={{ overflowX: "auto" }}>
                  <h5 style={{ color: "#fff", marginBottom: "16px" }}>👥 Usuarios registrados ({filteredUsers.length})</h5>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr>{["#", "Nombre", "Email", "Rol", "Acciones"].map(h => <th key={h} style={th}>{h}</th>)}</tr>
                    </thead>
                    <tbody>
                      {pagedUsers.map((u, i) => (
                        <tr key={u.id} style={{ transition: "background 0.2s" }} onMouseOver={e => e.currentTarget.style.background = "rgba(255,255,255,0.03)"} onMouseOut={e => e.currentTarget.style.background = "transparent"}>
                          <td style={{ ...td, color: "rgba(255,255,255,0.3)", width: "40px" }}>{(usersPage - 1) * ITEMS_PER_PAGE + i + 1}</td>
                          <td style={td}>
                            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                              <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: "linear-gradient(135deg,#f9d423,#ff4e50)", display: "grid", placeItems: "center", fontWeight: "800", color: "#000", fontSize: "0.8rem", flexShrink: 0 }}>
                                {u.name?.charAt(0).toUpperCase()}
                              </div>
                              {u.name}
                            </div>
                          </td>
                          <td style={{ ...td, color: "rgba(255,255,255,0.5)" }}>{u.email}</td>
                          <td style={td}><span style={{ background: u.is_admin ? "rgba(249,212,35,0.15)" : "rgba(0,242,254,0.1)", color: u.is_admin ? "#f9d423" : "#00f2fe", border: `1px solid ${u.is_admin ? "rgba(249,212,35,0.4)" : "rgba(0,242,254,0.3)"}`, borderRadius: "20px", padding: "3px 12px", fontSize: "0.7rem", fontWeight: "700" }}>{u.is_admin ? "🛡️ Admin" : "👤 Usuario"}</span></td>
                          <td style={td}>
                            <div style={{ display: "flex", gap: "8px" }}>
                              <button onClick={() => handleToggleAdmin(u)} style={{ background: "rgba(249,212,35,0.1)", color: "#f9d423", border: "1px solid rgba(249,212,35,0.3)", borderRadius: "6px", padding: "4px 10px", fontSize: "0.72rem", cursor: "pointer" }}>{u.is_admin ? "Quitar Admin" : "Hacer Admin"}</button>
                              <button onClick={() => openConfirmModal(`¿Eliminar al usuario "${u.name}"? Esta acción no se puede deshacer.`, () => deleteUserConfirmed(u.id), { type: "user", id: u.id })} style={{ background: "rgba(220,53,69,0.1)", color: "#ff6b7a", border: "1px solid rgba(220,53,69,0.3)", borderRadius: "6px", padding: "4px 10px", fontSize: "0.72rem", cursor: "pointer" }}>🗑️</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {renderPagination(usersPage, setUsersPage, totalUsersPages)}

                  {filteredUsers.length === 0 && <p style={{ color: "rgba(255,255,255,0.3)", textAlign: "center", padding: "40px" }}>No hay usuarios.</p>}
                </div>
              </>
            )}

            {/* POSTS */}
            {activeTab === "posts" && (
              <>
                <div style={{ marginBottom: 16 }}>
                  <input
                    type="text"
                    placeholder="Buscar posts por título o autor..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{
                      width: "100%",
                      maxWidth: 400,
                      padding: "8px 12px",
                      borderRadius: 6,
                      border: "1px solid rgba(255,255,255,0.2)",
                      background: "#0d1117",
                      color: "#fff",
                      fontSize: "0.9rem",
                    }}
                  />
                </div>

                <div style={{ overflowX: "auto" }}>
                  <h5 style={{ color: "#fff", marginBottom: "16px" }}>📝 Posts publicados ({filteredPosts.length})</h5>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr>{["#", "Título", "Autor", "Categoría", "Fecha", "Acciones"].map(h => <th key={h} style={th}>{h}</th>)}</tr>
                    </thead>
                    <tbody>
                      {pagedPosts.map((p, i) => (
                        <tr key={p.id} onMouseOver={e => e.currentTarget.style.background = "rgba(255,255,255,0.03)"} onMouseOut={e => e.currentTarget.style.background = "transparent"}>
                          <td style={{ ...td, color: "rgba(255,255,255,0.3)", width: "40px" }}>{(postsPage - 1) * ITEMS_PER_PAGE + i + 1}</td>
                          <td style={{ ...td, maxWidth: "260px" }}><div style={{ fontWeight: "600", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.title}</div></td>
                          <td style={{ ...td, color: "rgba(255,255,255,0.55)" }}>{p.author?.name || "Anónimo"}</td>
                          <td style={td}>{p.category ? <span style={{ background: "rgba(0,242,254,0.1)", color: "#00f2fe", border: "1px solid rgba(0,242,254,0.2)", borderRadius: "20px", padding: "2px 10px", fontSize: "0.68rem" }}>{p.category}</span> : <span style={{ color: "rgba(255,255,255,0.2)", fontSize: "0.75rem" }}>—</span>}</td>
                          <td style={{ ...td, color: "rgba(255,255,255,0.4)", fontSize: "0.78rem" }}>{p.created_at ? new Date(p.created_at).toLocaleDateString() : "—"}</td>
                          <td style={td}><button onClick={() => openConfirmModal(`¿Eliminar el post "${p.title}"? Esta acción no se puede deshacer.`, () => deletePostConfirmed(p.id), { type: "post", id: p.id })} style={{ background: "rgba(220,53,69,0.1)", color: "#ff6b7a", border: "1px solid rgba(220,53,69,0.3)", borderRadius: "6px", padding: "4px 12px", fontSize: "0.72rem", cursor: "pointer" }}>🗑️ Eliminar</button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {renderPagination(postsPage, setPostsPage, totalPostsPages)}

                  {filteredPosts.length === 0 && <p style={{ color: "rgba(255,255,255,0.3)", textAlign: "center", padding: "40px" }}>No hay posts.</p>}
                </div>
              </>
            )}

            {/* RUTAS */}
            {activeTab === "routes" && (
              <>
                <div style={{ marginBottom: 16 }}>
                  <input
                    type="text"
                    placeholder="Buscar rutas por título o destino..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{
                      width: "100%",
                      maxWidth: 400,
                      padding: "8px 12px",
                      borderRadius: 6,
                      border: "1px solid rgba(255,255,255,0.2)",
                      background: "#0d1117",
                      color: "#fff",
                      fontSize: "0.9rem",
                    }}
                  />
                </div>

                <div style={{ overflowX: "auto" }}>
                  <h5 style={{ color: "#fff", marginBottom: "16px" }}>🗺️ Rutas creadas ({filteredRoutes.length})</h5>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr>{["#", "Título", "Destino", "Autor", "Paradas", "Fecha", "Acciones"].map(h => <th key={h} style={th}>{h}</th>)}</tr>
                    </thead>
                    <tbody>
                      {pagedRoutes.map((r, i) => (
                        <tr key={r.id} onMouseOver={e => e.currentTarget.style.background = "rgba(255,255,255,0.03)"} onMouseOut={e => e.currentTarget.style.background = "transparent"}>
                          <td style={{ ...td, color: "rgba(255,255,255,0.3)", width: "40px" }}>{(routesPage - 1) * ITEMS_PER_PAGE + i + 1}</td>
                          <td style={{ ...td, maxWidth: "200px" }}><div style={{ fontWeight: "600", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.title}</div></td>
                          <td style={{ ...td, color: "rgba(255,255,255,0.55)" }}>📍 {r.destination}</td>
                          <td style={{ ...td, color: "rgba(255,255,255,0.55)" }}>{r.author?.name || "Anónimo"}</td>
                          <td style={td}><span style={{ background: "rgba(249,212,35,0.1)", color: "#f9d423", border: "1px solid rgba(249,212,35,0.2)", borderRadius: "20px", padding: "2px 10px", fontSize: "0.68rem" }}>{r.steps?.length || 0} paradas</span></td>
                          <td style={{ ...td, color: "rgba(255,255,255,0.4)", fontSize: "0.78rem" }}>{r.created_at ? new Date(r.created_at).toLocaleDateString() : "—"}</td>
                          <td style={td}><button onClick={() => openConfirmModal(`¿Eliminar la ruta "${r.title}"? Esta acción no se puede deshacer.`, () => deleteRouteConfirmed(r.id), { type: "route", id: r.id })} style={{ background: "rgba(220,53,69,0.1)", color: "#ff6b7a", border: "1px solid rgba(220,53,69,0.3)", borderRadius: "6px", padding: "4px 12px", fontSize: "0.72rem", cursor: "pointer" }}>🗑️ Eliminar</button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {renderPagination(routesPage, setRoutesPage, totalRoutesPages)}

                  {filteredRoutes.length === 0 && <p style={{ color: "rgba(255,255,255,0.3)", textAlign: "center", padding: "40px" }}>No hay rutas.</p>}
                </div>
              </>
            )}
          </>
        )}
      </div>

      {/* Modal de confirmación */}
      <ConfirmModal
        visible={confirmModal.visible}
        message={confirmModal.message}
        onConfirm={confirmModal.onConfirm}
        onCancel={closeConfirmModal}
      />

      <style>{`body { background: #0d1117 !important; }`}</style>
    </div>
  );
}