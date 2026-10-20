// src/front/components/Navbar.jsx
import React, { useState, useEffect, useCallback } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import logo from "../assets/logo.png";
import { API_BASE, authHeaders } from "../api/backend";

const getUser = () => {
  const raw = localStorage.getItem("user");
  if (!raw || raw === "undefined" || raw === "null") return null;
  try { return JSON.parse(raw); } catch { return null; }
};
const getToken = () => localStorage.getItem("token");

const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [token, setToken] = useState(getToken);
  const [user, setUser] = useState(getUser);
  const [isNavOpen, setIsNavOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [showNotif, setShowNotif] = useState(false);
  const [notifications, setNotifications] = useState([]);

  const closeNavbar = useCallback(() => {
    const navCollapse = document.getElementById("navbarNav");
    if (navCollapse && navCollapse.classList.contains("show")) {
      const bsCollapse = window.bootstrap?.Collapse?.getInstance(navCollapse);
      if (bsCollapse) bsCollapse.hide();
    }
    setIsNavOpen(false);
  }, []);

  const clearSession = useCallback((shouldNavigate = true) => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("token_exp");
    window.dispatchEvent(new Event("authChange"));
    setToken(null);
    setUser(null);
    setUnread(0);
    setNotifications([]);
    closeNavbar();
    if (shouldNavigate) navigate("/");
  }, [navigate, closeNavbar]);

  const refresh = useCallback(() => {
    setToken(getToken());
    setUser(getUser());
  }, []);

  const fetchUnread = useCallback(async () => {
    if (!localStorage.getItem("token")) return;
    try {
      const res = await fetch(`${API_BASE}/api/notifications/unread-count`, { headers: authHeaders() });
      if (!res.ok) return;
      const data = await res.json();
      setUnread(Number(data.unread_count || 0));
    } catch (e) {
      console.debug("No se pudo obtener unread_count", e);
    }
  }, []);

  const fetchNotifications = useCallback(async () => {
    if (!localStorage.getItem("token")) return;
    try {
      const res = await fetch(`${API_BASE}/api/notifications?page=1&per_page=8`, { headers: authHeaders() });
      if (!res.ok) return;
      const data = await res.json();
      setNotifications(data.items || []);
      setUnread(Number(data.unread_count || 0));
    } catch (e) {
      console.debug("No se pudieron cargar notificaciones", e);
    }
  }, []);

  const markAllRead = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/notifications/read-all`, { method: "POST", headers: authHeaders() });
      if (res.ok) {
        setUnread(0);
        setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      }
    } catch (e) {
      console.debug("No se pudieron marcar notificaciones", e);
    }
  };

  useEffect(() => {
    refresh();
  }, [location, refresh]);

  useEffect(() => {
    const onStorage = () => refresh();
    const onAuthChange = () => { refresh(); closeNavbar(); };
    window.addEventListener("storage", onStorage);
    window.addEventListener("authChange", onAuthChange);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("authChange", onAuthChange);
    };
  }, [refresh, closeNavbar]);

  useEffect(() => {
    if (!token) return;
    fetchUnread();
    const id = setInterval(fetchUnread, 30000);
    return () => clearInterval(id);
  }, [token, fetchUnread]);

  useEffect(() => {
    closeNavbar();
  }, [location.pathname, closeNavbar]);

  const isAdmin = !!(
    user && (
      user.is_admin === true ||
      user.is_admin === "true" ||
      user.role === "admin" ||
      user.role === "superuser"
    )
  );

  const bellStyle = {
    position: "relative",
    background: "rgba(255,255,255,0.08)",
    border: "1px solid rgba(255,255,255,0.2)",
    color: "#fff",
    borderRadius: "999px",
    width: "40px",
    height: "40px",
    display: "grid",
    placeItems: "center",
    cursor: "pointer",
  };

  return (
    <nav className="navbar navbar-expand-lg navbar-dark sticky-top" style={{ background: "rgba(13,17,23,0.95)", backdropFilter: "blur(12px)", borderBottom: "1px solid rgba(0,242,254,0.2)", boxShadow: "0 4px 30px rgba(0,0,0,0.4)", padding: "10px 0" }}>
      <div className="container d-flex align-items-center text-white">
        <Link className="navbar-brand d-flex align-items-center gap-2" to="/" style={{ textDecoration: "none" }}>
          <img src={logo} alt="BlogYU Logo" style={{ width: "70px", height: "70px", objectFit: "contain" }} />
          <div className="d-flex flex-column justify-content-center" style={{ lineHeight: "1" }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: "4px" }}>
              <span style={{ fontSize: "1.8rem", fontWeight: "900", color: "#fff" }}>Blog</span>
              <span style={{ fontSize: "1.8rem", fontWeight: "900", background: "linear-gradient(135deg, #00f2fe 0%, #4facfe 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>YU</span>
            </div>
            <small style={{ fontSize: "0.55rem", letterSpacing: "2.5px", color: "#f9d423", textTransform: "uppercase", fontWeight: "800" }}>Comunidad Viajera</small>
          </div>
        </Link>

        <button className="navbar-toggler border-0 shadow-none" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav" onClick={() => setIsNavOpen(!isNavOpen)}>
          <span className="navbar-toggler-icon"></span>
        </button>

        <div className="collapse navbar-collapse" id="navbarNav">
          <ul className="navbar-nav ms-auto align-items-center gap-3">
            {token ? (
              <>
                {isAdmin && (
                  <li className="nav-item">
                    <Link to="/admin" onClick={closeNavbar} className="btn btn-sm fw-bold px-3" style={{ background: "rgba(249,212,35,0.05)", border: "1px solid #f9d423", color: "#f9d423", borderRadius: "8px", fontSize: "0.75rem" }}>
                      Panel Admin
                    </Link>
                  </li>
                )}

                <li className="nav-item"><Link className="nav-link" to="/my-routes" onClick={closeNavbar}>🗺️ Mis Rutas</Link></li>
                <li className="nav-item"><Link className="nav-link" to="/my-posts" onClick={closeNavbar}>📝 Mis Posts</Link></li>

                <li className="nav-item position-relative">
                  <button
                    type="button"
                    style={bellStyle}
                    onClick={async () => {
                      const next = !showNotif;
                      setShowNotif(next);
                      if (next) await fetchNotifications();
                    }}
                    title="Notificaciones"
                  >
                    🔔
                    {unread > 0 && (
                      <span style={{ position: "absolute", top: -4, right: -2, background: "#ff4e50", color: "#fff", borderRadius: "999px", minWidth: "18px", height: "18px", fontSize: "0.68rem", display: "grid", placeItems: "center", padding: "0 4px" }}>
                        {unread > 99 ? "99+" : unread}
                      </span>
                    )}
                  </button>

                  {showNotif && (
                    <div style={{ position: "absolute", right: 0, top: "120%", width: 330, maxHeight: 420, overflowY: "auto", background: "#111820", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 10, zIndex: 50, padding: 10 }}>
                      <div className="d-flex justify-content-between align-items-center mb-2">
                        <strong style={{ fontSize: "0.9rem" }}>Notificaciones</strong>
                        <button onClick={markAllRead} style={{ background: "transparent", border: "none", color: "#00f2fe", fontSize: "0.75rem" }}>Marcar todo</button>
                      </div>
                      {notifications.length === 0 ? (
                        <p style={{ color: "rgba(255,255,255,0.5)", margin: 0, fontSize: "0.82rem" }}>No tienes notificaciones.</p>
                      ) : notifications.map((n) => (
                        <div key={n.id} style={{ padding: "8px 6px", borderBottom: "1px solid rgba(255,255,255,0.08)", opacity: n.is_read ? 0.6 : 1 }}>
                          <div style={{ fontSize: "0.82rem" }}>
                            {n.type === "comment" ? "💬" : "💛"} {n.actor_name || "Alguien"} {n.type === "comment" ? "comentó tu publicación" : "dio like a tu publicación"}
                          </div>
                          <small style={{ color: "rgba(255,255,255,0.45)" }}>{n.created_at ? new Date(n.created_at).toLocaleString() : ""}</small>
                        </div>
                      ))}
                    </div>
                  )}
                </li>

                <li className="nav-item ms-lg-2">
                  <Link to={`/profile/${user?.id}`} className="btn rounded-pill px-4 fw-bold" onClick={closeNavbar} style={{ background: "rgba(0,242,254,0.08)", border: "1px solid rgba(0,242,254,0.4)", color: "#00f2fe" }}>
                    🌍 {user?.name || "Viajero"}
                  </Link>
                </li>

                <li className="nav-item">
                  <button onClick={() => clearSession(true)} className="btn btn-sm fw-bold" style={{ border: "1px solid rgba(255,78,80,0.4)", color: "#ff4e50", borderRadius: "50px" }}>
                    Salir
                  </button>
                </li>
              </>
            ) : (
              <>
                <li className="nav-item"><Link className="nav-link" to="/login" onClick={closeNavbar}>Entrar</Link></li>
                <li className="nav-item"><Link to="/register" className="btn px-4 fw-bold text-dark" onClick={closeNavbar} style={{ background: "linear-gradient(135deg, #f9d423 0%, #ff4e50 100%)", borderRadius: "50px" }}>¡Unirme ahora!</Link></li>
              </>
            )}
          </ul>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
