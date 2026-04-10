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
        padding: "10px 0"
      }}
    >
      <div className="container d-flex align-items-center text-white">

        {/* LOGO SECCIÓN */}
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

        <button className="navbar-toggler border-0 shadow-none" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav">
          <span className="navbar-toggler-icon"></span>
        </button>

        <div className="collapse navbar-collapse" id="navbarNav">
          <ul className="navbar-nav ms-auto align-items-center gap-3">

            {token ? (
              <>
                {/* BOTÓN ADMIN - Estilo Moderno y Acorde */}
                {user && user.is_admin && (
                  <li className="nav-item">
                    <Link to="/admin" 
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

                <li className="nav-item">
                  <Link className="nav-link hover-link fw-bold" to="/my-posts">Mis Posts</Link>
                </li>
                <li className="nav-item">
                  <Link className="nav-link hover-link fw-bold" to="/my-routes">Mis Rutas</Link>
                </li>
                
                {/* PERFIL USUARIO */}
                <li className="nav-item ms-lg-2">
                  <Link to="/profile" className="btn rounded-pill px-4 fw-bold user-profile-btn">
                    🌍 {user?.name || "Viajero"}
                  </Link>
                </li>

                {/* LOGOUT */}
                <li className="nav-item">
                  <button onClick={handleLogout} className="btn logout-btn btn-sm fw-bold">Salir</button>
                </li>
              </>
            ) : (
              <>
                <li className="nav-item"><Link className="nav-link hover-link fw-bold" to="/login">Entrar</Link></li>
                <li className="nav-item">
                  <Link to="/register" className="btn signup-btn px-4 fw-bold text-dark">¡Unirme ahora!</Link>
                </li>
              </>
            )}
          </ul>
        </div>
      </div>

      <style>{`
        /* Efectos Hover Generales */
        .hover-link { 
            color: rgba(255,255,255,0.7) !important; 
            font-size: 0.85rem; 
            transition: 0.3s ease; 
        }
        .hover-link:hover { 
            color: #00d4ff !important; 
            transform: translateY(-1.5px);
        }

        /* Botón Admin - Hover */
        .admin-button:hover {
            background: rgba(249,212,35,0.15) !important;
            box-shadow: 0 0 15px rgba(249,212,35,0.3);
            transform: scale(1.02);
            color: #fff !important;
            border-color: #fff !important;
        }

        /* Botón Perfil */
        .user-profile-btn {
            background: rgba(0,242,254,0.08);
            border: 1px solid rgba(0,242,254,0.4);
            color: #00f2fe;
            font-size: 0.9rem;
            transition: 0.3s ease;
        }
        .user-profile-btn:hover {
            background: rgba(0,242,254,0.15);
            border-color: #00f2fe;
            box-shadow: 0 0 12px rgba(0,242,254,0.3);
            color: #fff;
        }

        /* Logout */
        .logout-btn {
            background: transparent;
            border: 1px solid rgba(255,78,80,0.4);
            color: #ff4e50;
            border-radius: 50px;
            transition: 0.3s ease;
        }
        .logout-btn:hover {
            background: rgba(255,78,80,0.1);
            border-color: #ff4e50;
            color: #fff;
        }

        /* Registro */
        .signup-btn {
            background: linear-gradient(135deg, #f9d423 0%, #ff4e50 100%);
            border-radius: 50px;
            font-size: 0.9rem;
            box-shadow: 0 4px 15px rgba(249,212,35,0.2);
            transition: 0.3s ease;
        }
        .signup-btn:hover {
            transform: scale(1.05);
            box-shadow: 0 6px 20px rgba(249,212,35,0.4);
        }

        @media (max-width: 991px) {
            .navbar-collapse { margin-top: 15px; padding-bottom: 10px; }
            .nav-item { margin-bottom: 8px; }
        }
      `}</style>
    </nav>
  );
};

export default Navbar;