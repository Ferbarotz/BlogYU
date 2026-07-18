// src/front/components/Navbar.jsx
import React, { useState, useEffect, useCallback } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import logo from "../assets/logo.png";

const getUser = () => {
  const raw = localStorage.getItem("user");
  if (!raw || raw === "undefined" || raw === "null") return null;
  try { return JSON.parse(raw); } catch { return null; }
};
const getToken = () => localStorage.getItem("token");

const tokenHasExpiredJWT = (token) => {
  if (!token) return true;
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return false;
    const payload = JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")));
    if (!payload.exp) return false;
    const now = Math.floor(Date.now() / 1000);
    return payload.exp <= now;
  } catch (err) {
    return false;
  }
};

const tokenHasExpiredStored = () => {
  const raw = localStorage.getItem("token_exp");
  if (!raw) return false;
  const n = Number(raw);
  if (Number.isNaN(n)) return false;
  const ts = n > 1e10 ? n : n * 1000;
  return Date.now() > ts;
};

const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [token, setToken] = useState(getToken);
  const [user, setUser] = useState(getUser);
  const [isNavOpen, setIsNavOpen] = useState(false);

  const closeNavbar = useCallback(() => {
    const navCollapse = document.getElementById("navbarNav");
    if (navCollapse && navCollapse.classList.contains("show")) {
      const bsCollapse = window.bootstrap?.Collapse?.getInstance(navCollapse);
      if (bsCollapse) {
        bsCollapse.hide();
      }
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
    closeNavbar(); // Cerrar menú al hacer logout
    if (shouldNavigate) navigate("/");
  }, [navigate, closeNavbar]);

  const refresh = useCallback(() => {
    setToken(getToken());
    setUser(getUser());
  }, []);

  const ensureValidSession = useCallback(() => {
    const t = getToken();
    if (!t) return;
    if (tokenHasExpiredJWT(t)) { clearSession(true); return; }
    if (tokenHasExpiredStored()) { clearSession(true); return; }
    // Optional: server-side validation can be added here
  }, [clearSession]);

  useEffect(() => {
    refresh();
    ensureValidSession();
  }, [location, refresh, ensureValidSession]);

  useEffect(() => {
    const onStorage = () => refresh();
    const onAuthChange = () => {
      refresh();
      closeNavbar(); // Cerrar menú cuando cambia la autenticación
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener("authChange", onAuthChange);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("authChange", onAuthChange);
    };
  }, [refresh, closeNavbar]);

  // Cerrar menú al cambiar de página
  useEffect(() => {
    closeNavbar();
  }, [location.pathname, closeNavbar]);

  // Cerrar menú al hacer clic fuera de él
  useEffect(() => {
    const handleClickOutside = (event) => {
      const navCollapse = document.getElementById("navbarNav");
      const navToggler = document.querySelector(".navbar-toggler");
      
      if (
        isNavOpen &&
        navCollapse &&
        !navCollapse.contains(event.target) &&
        navToggler &&
        !navToggler.contains(event.target)
      ) {
        closeNavbar();
      }
    };

    if (isNavOpen) {
      document.addEventListener("click", handleClickOutside);
      return () => document.removeEventListener("click", handleClickOutside);
    }
  }, [isNavOpen, closeNavbar]);

  useEffect(() => {
    ensureValidSession();
    const onFocus = () => ensureValidSession();
    window.addEventListener("focus", onFocus);
    const interval = setInterval(() => { ensureValidSession(); }, 5 * 60 * 1000);
    return () => {
      window.removeEventListener("focus", onFocus);
      clearInterval(interval);
    };
  }, [ensureValidSession]);

  const handleLogout = () => {
    clearSession(true);
  };

  const isAdmin = !!(
    user && (
      user.is_admin === true ||
      user.is_admin === "true" ||
      user.role === "admin" ||
      user.role === "superuser"
    )
  );

  return (
    <nav
      className="navbar navbar-expand-lg navbar-dark sticky-top"
      style={{
        background: "rgba(13,17,23,0.95)",
        backdropFilter: "blur(12px)",
        borderBottom: "1px solid rgba(0,242,254,0.2)",
        boxShadow: "0 4px 30px rgba(0,0,0,0.4)",
        padding: "10px 0"
      }}
    >
      <div className="container d-flex align-items-center text-white">

        <Link className="navbar-brand d-flex align-items-center gap-2" to="/" style={{ textDecoration: "none" }}>
          <img
            src={logo}
            alt="BlogYU Logo"
            style={{
              width: "70px",
              height: "70px",
              objectFit: "contain",
              filter: "drop-shadow(0 0 8px rgba(0,242,254,0.3))"
            }}
          />
          <div className="d-flex flex-column justify-content-center" style={{ lineHeight: "1" }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: "4px" }}>
              <span style={{ fontSize: "1.8rem", fontWeight: "900", color: "#fff", letterSpacing: "-1px" }}>Blog</span>
              <span style={{
                fontSize: "1.8rem",
                fontWeight: "900",
                background: "linear-gradient(135deg, #00f2fe 0%, #4facfe 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                filter: "drop-shadow(0 0 5px rgba(0,242,254,0.3))"
              }}>YU</span>
            </div>
            <small style={{ fontSize: "0.55rem", letterSpacing: "2.5px", color: "#f9d423", textTransform: "uppercase", fontWeight: "800" }}>
              Comunidad Viajera
            </small>
          </div>
        </Link>

        <button 
          className="navbar-toggler border-0 shadow-none" 
          type="button" 
          data-bs-toggle="collapse" 
          data-bs-target="#navbarNav"
          onClick={() => setIsNavOpen(!isNavOpen)}
          aria-controls="navbarNav"
          aria-expanded={isNavOpen}
          aria-label="Toggle navigation"
        >
          <span className="navbar-toggler-icon"></span>
        </button>

        <div className="collapse navbar-collapse" id="navbarNav">
          <ul className="navbar-nav ms-auto align-items-center gap-3">
            {token ? (
              <>
                {isAdmin && (
                  <li className="nav-item">
                    <Link
                      to="/admin"
                      onClick={closeNavbar}
                      className="btn btn-sm fw-bold px-3 d-flex align-items-center gap-2 admin-button"
                      style={{
                        background: "rgba(249,212,35,0.05)",
                        border: "1px solid #f9d423",
                        color: "#f9d423",
                        borderRadius: "8px",
                        fontSize: "0.75rem",
                        letterSpacing: "1px",
                        padding: "6px 12px",
                        textTransform: "uppercase",
                        transition: "all 0.3s ease"
                      }}>
                      <i className="fas fa-shield-alt" style={{ fontSize: "0.9rem" }}></i>
                      Panel Admin
                    </Link>
                  </li>
                )}

                {/* Mis Rutas */}
                <li className="nav-item">
                  <Link className="nav-chip nav-chip--routes fw-bold" to="/my-routes" onClick={closeNavbar}>
                    <span>🗺️</span> Mis Rutas
                  </Link>
                </li>

                {/* Mis Posts */}
                <li className="nav-item">
                  <Link className="nav-chip nav-chip--posts fw-bold" to="/my-posts" onClick={closeNavbar}>
                    <span>📝</span> Mis Posts
                  </Link>
                </li>

                <li className="nav-item ms-lg-2">
                  <Link to={`/profile/${user?.id}`} className="btn rounded-pill px-4 fw-bold user-profile-btn" onClick={closeNavbar}>
                    🌍 {user?.name || "Viajero"}
                  </Link>
                </li>

                <li className="nav-item">
                  <button onClick={handleLogout} className="btn logout-btn btn-sm fw-bold">Salir</button>
                </li>
              </>
            ) : (
              <>
                {/* Enlace "Entrar" actualizado: relleno azul (gradiente) con texto NEGRO */}
                <li className="nav-item">
                  <Link className="nav-link login-link fw-bold" to="/login" onClick={closeNavbar}>Entrar</Link>
                </li>

                <li className="nav-item">
                  <Link to="/register" className="btn signup-btn px-4 fw-bold text-dark" onClick={closeNavbar}>¡Unirme ahora!</Link>
                </li>
              </>
            )}
          </ul>
        </div>
      </div>

      <style>{`
        .hover-link { color: rgba(255,255,255,0.7) !important; font-size: 0.85rem; transition: 0.3s ease; }
        .hover-link:hover { color: #00d4ff !important; transform: translateY(-1.5px); }
        .admin-button:hover { background: rgba(249,212,35,0.15) !important; box-shadow: 0 0 15px rgba(249,212,35,0.3); transform: scale(1.02); color: #fff !important; border-color: #fff !important; }
        .user-profile-btn { background: rgba(0,242,254,0.08); border: 1px solid rgba(0,242,254,0.4); color: #00f2fe; font-size: 0.9rem; transition: 0.3s ease; }
        .user-profile-btn:hover { background: rgba(0,242,254,0.15); border-color: #00f2fe; box-shadow: 0 0 12px rgba(0,242,254,0.3); color: #fff; }
        .logout-btn { background: transparent; border: 1px solid rgba(255,78,80,0.4); color: #ff4e50; border-radius: 50px; transition: 0.3s ease; }
        .logout-btn:hover { background: rgba(255,78,80,0.1); border-color: #ff4e50; color: #fff; }
        .signup-btn { background: linear-gradient(135deg, #f9d423 0%, #ff4e50 100%); border-radius: 50px; font-size: 0.9rem; box-shadow: 0 4px 15px rgba(249,212,35,0.2); transition: 0.3s ease; }
        .signup-btn:hover { transform: scale(1.05); box-shadow: 0 6px 20px rgba(249,212,35,0.4); }

        /* Nav-chip (Mis Rutas / Mis Posts) - ahora texto NEGRO */
        .nav-chip {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 6px 12px;
          border-radius: 20px;
          color: #000; /* <- texto negro */
          font-weight: 700;
          font-size: 0.9rem;
          transition: transform .22s ease, box-shadow .22s ease, filter .22s ease;
          text-decoration: none;
          margin: 0 6px;
        }
        .nav-chip span { display: inline-flex; align-items: center; justify-content: center; font-size: 1rem; }

        .nav-chip--routes{
          background: linear-gradient(135deg, #f9d423 0%, #ff4e50 100%);
          border: 1px solid rgba(249,212,35,0.25);
          box-shadow: 0 4px 12px rgba(249,212,35,0.12);
        }
        .nav-chip--routes:hover{
          transform: translateY(-3px);
          box-shadow: 0 12px 40px rgba(249,212,35,0.24);
          filter: brightness(1.03);
        }

        .nav-chip--posts{
          background: linear-gradient(135deg, #00f2fe 0%, #4facfe 100%);
          border: 1px solid rgba(0,242,254,0.22);
          box-shadow: 0 4px 12px rgba(0,242,254,0.10);
        }
        .nav-chip--posts:hover{
          transform: translateY(-3px);
          box-shadow: 0 12px 40px rgba(0,242,254,0.22);
          filter: brightness(1.03);
        }

        .login-link {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          padding: 7px 14px;
          border-radius: 50px;
          color: #000 !important;
          background: linear-gradient(135deg, #00f2fe 0%, #4facfe 100%);
          border: 1px solid rgba(0,242,254,0.28);
          box-shadow: 0 6px 18px rgba(0,242,254,0.18);
          text-decoration: none !important;
          font-weight: 700;
          font-size: 0.9rem;
          transition: transform .18s ease, box-shadow .18s ease, filter .18s ease;
        }
        .login-link:hover { transform: translateY(-2px); box-shadow: 0 10px 28px rgba(0,242,254,0.28); filter: brightness(1.03); color: #000 !important; }

        @media (max-width: 991px) { .navbar-collapse { margin-top: 15px; padding-bottom: 10px; } .nav-item { margin-bottom: 8px; } }
        @media (max-width: 575px) { .nav-chip { padding: 6px 8px; font-size: 0.85rem; gap: 6px; } .login-link { padding: 6px 10px; font-size: 0.85rem; } }
      `}</style>
    </nav>
  );
};

export default Navbar;