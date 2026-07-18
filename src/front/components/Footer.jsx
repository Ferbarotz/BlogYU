// src/front/components/Footer.jsx
import React from "react";
import { Link } from "react-router-dom";

const Footer = () => {
  const year = new Date().getFullYear();

  const linkStyle = {
    color: "rgba(255,255,255,0.55)",
    textDecoration: "none",
    fontSize: "0.9rem",
    transition: "color 0.25s ease",
    display: "inline-block",
    padding: "3px 0",
  };

  return (
    <footer
      style={{
        background: "rgba(13,17,23,0.97)",
        borderTop: "1px solid rgba(0,242,254,0.15)",
        marginTop: "40px",
        position: "relative",
      }}
    >
      {/* Línea de acento superior (azul → amarillo, identidad de la marca) */}
      <div
        style={{
          height: "3px",
          background: "linear-gradient(to right, #00f2fe, #4facfe, #f9d423)",
        }}
      />

      <div className="container py-5">
        <div className="row gy-4">
          {/* Marca */}
          <div className="col-lg-4 col-md-6">
            <Link to="/" style={{ textDecoration: "none" }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: "4px" }}>
                <span style={{ fontSize: "1.6rem", fontWeight: 900, color: "#fff", letterSpacing: "-1px" }}>
                  Blog
                </span>
                <span
                  style={{
                    fontSize: "1.6rem",
                    fontWeight: 900,
                    background: "linear-gradient(135deg, #00f2fe 0%, #4facfe 100%)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                  }}
                >
                  YU
                </span>
              </div>
            </Link>
            <p
              style={{
                color: "#f9d423",
                letterSpacing: "2.5px",
                fontSize: "0.6rem",
                textTransform: "uppercase",
                fontWeight: 800,
                marginTop: "2px",
              }}
            >
              Comunidad Viajera
            </p>
            <p style={{ color: "rgba(255,255,255,0.45)", fontSize: "0.9rem", marginTop: "12px", maxWidth: "300px" }}>
              Descubre y comparte los mejores destinos, rutas y experiencias recomendadas por viajeros como tú.
            </p>
          </div>

          {/* Explorar */}
          <div className="col-lg-2 col-md-6 col-6">
            <h6
              style={{
                color: "rgba(255,255,255,0.9)",
                textTransform: "uppercase",
                letterSpacing: "2px",
                fontSize: "0.75rem",
                fontWeight: 700,
                marginBottom: "14px",
              }}
            >
              Explorar
            </h6>
            <ul className="list-unstyled d-flex flex-column gap-1 mb-0">
              <li>
                <Link to="/" className="footer-link" style={linkStyle}>Inicio</Link>
              </li>
              <li>
                <Link to="/posts" className="footer-link" style={linkStyle}>Publicaciones</Link>
              </li>
              <li>
                <Link to="/categories" className="footer-link" style={linkStyle}>Categorías</Link>
              </li>
            </ul>
          </div>

          {/* Cuenta */}
          <div className="col-lg-2 col-md-6 col-6">
            <h6
              style={{
                color: "rgba(255,255,255,0.9)",
                textTransform: "uppercase",
                letterSpacing: "2px",
                fontSize: "0.75rem",
                fontWeight: 700,
                marginBottom: "14px",
              }}
            >
              Cuenta
            </h6>
            <ul className="list-unstyled d-flex flex-column gap-1 mb-0">
              <li>
                <Link to="/login" className="footer-link" style={linkStyle}>Iniciar sesión</Link>
              </li>
              <li>
                <Link to="/register" className="footer-link" style={linkStyle}>Registrarse</Link>
              </li>
              <li>
                <Link to="/my-routes" className="footer-link" style={linkStyle}>Mis rutas</Link>
              </li>
              <li>
                <Link to="/my-posts" className="footer-link" style={linkStyle}>Mis posts</Link>
              </li>
            </ul>
          </div>

          {/* Contenido / CTA */}
          <div className="col-lg-4 col-md-6">
            <h6
              style={{
                color: "rgba(255,255,255,0.9)",
                textTransform: "uppercase",
                letterSpacing: "2px",
                fontSize: "0.75rem",
                fontWeight: 700,
                marginBottom: "14px",
              }}
            >
              Crea y comparte
            </h6>
            <div className="d-flex flex-wrap gap-2">
              <Link
                to="/new-post"
                className="fw-bold"
                style={{
                  background: "linear-gradient(135deg, #00f2fe 0%, #4facfe 100%)",
                  color: "#000",
                  padding: "8px 18px",
                  borderRadius: "50px",
                  textDecoration: "none",
                  fontSize: "0.85rem",
                }}
              >
                ✍️ Nueva publicación
              </Link>
              <Link
                to="/create-route"
                className="fw-bold"
                style={{
                  background: "linear-gradient(135deg, #f9d423 0%, #ff4e50 100%)",
                  color: "#000",
                  padding: "8px 18px",
                  borderRadius: "50px",
                  textDecoration: "none",
                  fontSize: "0.85rem",
                }}
              >
                🗺️ Nueva ruta
              </Link>
            </div>
          </div>
        </div>

        {/* Barra inferior */}
        <div
          className="d-flex flex-column flex-md-row justify-content-between align-items-center gap-2 mt-4 pt-4"
          style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
        >
          <p style={{ color: "rgba(255,255,255,0.35)", fontSize: "0.8rem", margin: 0 }}>
            © {year} BlogYU · Comunidad Viajera. Todos los derechos reservados.
          </p>
          <p style={{ color: "rgba(255,255,255,0.35)", fontSize: "0.8rem", margin: 0 }}>
            Hecho con <span style={{ color: "#ff4e50" }}>♥</span> para viajeros
          </p>
        </div>
      </div>

      <style>{`
        .footer-link:hover { color: #00f2fe !important; }
      `}</style>
    </footer>
  );
};

export default Footer;
