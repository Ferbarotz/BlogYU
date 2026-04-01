// src/front/components/Navbar.jsx
import React from "react";
import { Link, useNavigate } from "react-router-dom";
import logo from "../assets/logo.png";

const Navbar = () => {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");
  const user = JSON.parse(localStorage.getItem("user") || "null");

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/");
  };

  return (
    <nav
      className="navbar navbar-expand-lg navbar-dark sticky-top"
      style={{
        background: "rgba(13,17,23,0.95)",
        backdropFilter: "blur(12px)",
        borderBottom: "1px solid rgba(0,242,254,0.2)",
        boxShadow: "0 4px 30px rgba(0,0,0,0.4)",
        padding: "12px 0"
      }}
    >
      <div className="container d-flex align-items-center">

        {/* LOGO */}
        <Link className="navbar-brand d-flex align-items-center gap-3" to="/" style={{ textDecoration: "none" }}>
          <img
            src={logo}
            alt="BlogYU Logo"
            style={{
              width: "96px",        // aumentado
              height: "96px",       // aumentado
              objectFit: "contain",
              filter: "drop-shadow(0 0 12px rgba(0,242,254,0.45))"
            }}
          />
          <div className="d-flex flex-column justify-content-center" style={{ lineHeight: "1" }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: "6px" }}>
              <span style={{
                fontSize: "2.2rem",    // aumentado
                fontWeight: "900",
                color: "#fff",
                letterSpacing: "-1.5px",
                fontFamily: "'Inter', sans-serif",
                textShadow: "0 0 20px rgba(255,255,255,0.08)"
              }}>Blog</span>
              <span style={{
                fontSize: "2.2rem",    // aumentado
                fontWeight: "900",
                background: "linear-gradient(135deg, #00f2fe 0%, #4facfe 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                letterSpacing: "-1.5px",
                fontFamily: "'Inter', sans-serif",
                filter: "drop-shadow(0 0 10px rgba(0,242,254,0.45))"
              }}>YU</span>
            </div>
            <small style={{
              fontSize: "0.65rem",   // ligeramente aumentado
              letterSpacing: "3px",
              color: "#f9d423",
              textTransform: "uppercase",
              fontWeight: "800",
              marginTop: "2px"
            }}>Comunidad Viajera</small>
          </div>
        </Link>

        <button className="navbar-toggler border-0" type="button"
          data-bs-toggle="collapse" data-bs-target="#navbarNav">
          <span className="navbar-toggler-icon"></span>
        </button>

        <div className="collapse navbar-collapse" id="navbarNav">
          <ul className="navbar-nav ms-auto align-items-center gap-2">

            {token ? (
              <>
                <li className="nav-item">
                  <Link className="nav-link nav-hover fw-bold" to="/my-posts">
                    📝 Mis Posts
                  </Link>
                </li>
                <li className="nav-item">
                  <Link className="nav-link nav-hover fw-bold" to="/my-routes">
                    🗺️ Mis Rutas
                  </Link>
                </li>
                <li className="nav-item ms-2">
                  <Link
                    to="/profile"
                    className="btn rounded-pill px-4 fw-bold d-flex align-items-center gap-2"
                    style={{
                      background: "rgba(0,242,254,0.08)",
                      border: "1px solid rgba(0,242,254,0.4)",
                      color: "#00f2fe", fontSize: "0.95rem",
                      transition: "all 0.3s ease"
                    }}
                    onMouseOver={(e) => e.currentTarget.style.background = "rgba(0,242,254,0.18)"}
                    onMouseOut={(e) => e.currentTarget.style.background = "rgba(0,242,254,0.08)"}
                  >
                    🌍 {user?.name || "Viajero"}
                  </Link>
                </li>
                <li className="nav-item">
                  <button
                    onClick={handleLogout}
                    className="btn rounded-pill px-3 btn-sm fw-bold"
                    style={{
                      background: "rgba(255,78,80,0.15)",
                      border: "1px solid rgba(255,78,80,0.4)",
                      color: "#ff4e50", fontSize: "0.8rem",
                      transition: "all 0.3s ease"
                    }}
                    onMouseOver={(e) => e.currentTarget.style.background = "rgba(255,78,80,0.3)"}
                    onMouseOut={(e) => e.currentTarget.style.background = "rgba(255,78,80,0.15)"}
                  >
                    Salir
                  </button>
                </li>
              </>
            ) : (
              <>
                <li className="nav-item">
                  <Link className="nav-link nav-hover fw-bold" to="/login">Entrar</Link>
                </li>
                <li className="nav-item">
                  <Link
                    className="btn rounded-pill px-4 fw-bold text-dark"
                    style={{
                      background: "linear-gradient(135deg, #f9d423 0%, #ff4e50 100%)",
                      border: "none", fontSize: "0.95rem",
                      boxShadow: "0 0 15px rgba(249,212,35,0.3)",
                      transition: "all 0.3s ease"
                    }}
                    onMouseOver={(e) => e.currentTarget.style.transform = "scale(1.05)"}
                    onMouseOut={(e) => e.currentTarget.style.transform = "scale(1)"}
                    to="/register"
                  >
                    ¡Unirme ahora!
                  </Link>
                </li>
              </>
            )}
          </ul>
        </div>
      </div>

      <style>{`
        .nav-hover { color: rgba(255,255,255,0.85) !important; font-size: 0.9rem; letter-spacing: 0.5px; transition: all 0.3s ease; }
        .nav-hover:hover { color: #00f2fe !important; transform: translateY(-1px); }

        /* Responsivo: reducir logo y tamaño de fuente en pantallas pequeñas */
        @media (max-width: 576px) {
          .navbar-brand img {
            width: 64px !important;
            height: 64px !important;
          }
          .navbar-brand span {
            font-size: 1.25rem !important;
          }
          .navbar-brand small {
            font-size: 0.55rem !important;
          }
          .btn.px-4 {
            padding-left: 12px !important;
            padding-right: 12px !important;
          }
        }
      `}</style>
    </nav>
  );
};

export default Navbar;