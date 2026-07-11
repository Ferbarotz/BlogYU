// src/front/components/MediaCard.jsx
// Componente de tarjeta COMPARTIDO para posts y rutas.
// Garantiza que PostCard y RouteCard se vean idénticos: el único parámetro
// que cambia es el color de acento (accent / accentGradient).
//
// Orden del layout (de arriba a abajo):
//   1. Categoría (arriba izquierda)  +  Número de fotos (arriba derecha)
//   2. Fotos (carrusel)
//   3. Nombre
//   4. Autor
//   5. Fecha  ·  Ubicación
//   6. Ver detalle · Editar · Borrar

import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";

// ── Placeholder animado cuando NO hay fotos ──
const NoPhotosPlaceholder = ({ accent }) => {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setIdx((p) => (p + 1) % 3), 2500);
    return () => clearInterval(id);
  }, []);

  const slides = [
    { icon: "📝", label: "PUBLICACIÓN", sub: "Añade fotos para darle vida" },
    { icon: "🏙️", label: "DESTINO", sub: "Convierte esto en una galería" },
    { icon: "✍️", label: "HISTORIA", sub: "Sube fotos de tu experiencia" },
  ];
  const s = slides[idx];

  return (
    <div style={{ position: "relative", height: "100%", background: "#1a1a2e", overflow: "hidden" }}>
      <div style={{
        position: "absolute", inset: 0,
        background: `radial-gradient(circle at 25% 30%, ${accent}22, transparent 55%)`
      }} />
      <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center" }}>
        <div style={{ textAlign: "center", color: "rgba(255,255,255,0.6)" }}>
          <div style={{ fontSize: "44px", marginBottom: "8px" }}>{s.icon}</div>
          <div style={{ fontWeight: 800, letterSpacing: "2px", fontSize: "11px", color: "rgba(255,255,255,0.45)" }}>{s.label}</div>
          <div style={{ fontSize: "11px", marginTop: "4px", color: "rgba(255,255,255,0.35)" }}>{s.sub}</div>
        </div>
      </div>
      <div style={{ position: "absolute", bottom: "8px", left: "50%", transform: "translateX(-50%)", display: "flex", gap: "6px", zIndex: 2 }}>
        {[0, 1, 2].map((d) => (
          <div key={d} onClick={() => setIdx(d)} style={{
            width: d === idx ? "18px" : "6px", height: "6px", borderRadius: "3px",
            background: d === idx ? accent : "rgba(255,255,255,0.35)",
            cursor: "pointer", transition: "all 0.25s ease"
          }} />
        ))}
      </div>
    </div>
  );
};

const MediaCard = ({
  accent = "#00f2fe",
  accentGradient = "linear-gradient(135deg, #00f2fe 0%, #4facfe 100%)",
  categoryIcon = "📍",
  categoryLabel = "",
  photos = [],
  title = "",
  date = "",
  location = "",
  author = null,        // { name, avatar, id }
  showAuthor = true,
  onView,
  onEdit,
  onDelete,
  showActions = false,
}) => {
  const [currentPhoto, setCurrentPhoto] = useState(0);

  useEffect(() => {
    if (photos.length <= 1) return;
    const interval = setInterval(
      () => setCurrentPhoto((prev) => (prev + 1) % photos.length),
      2500
    );
    return () => clearInterval(interval);
  }, [photos.length]);

  const handleView = () => { if (typeof onView === "function") onView(); };

  return (
    <div
      className="h-100 rounded-4 overflow-hidden"
      style={{
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.08)",
        transition: "all 0.3s ease",
        display: "flex",
        flexDirection: "column",
      }}
      onMouseOver={(e) => (e.currentTarget.style.border = `1px solid ${accent}80`)}
      onMouseOut={(e) => (e.currentTarget.style.border = "1px solid rgba(255,255,255,0.08)")}
    >
      {/* ── FOTOS con badges flotantes ── */}
      <div style={{ position: "relative", height: "220px", background: "#1a1a2e", overflow: "hidden" }}>
        {photos.length > 0 ? (
          <>
            <img
              src={photos[currentPhoto]}
              alt={title}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                objectPosition: "center center",
                display: "block",
                transition: "opacity 0.6s ease",
              }}
              onError={(e) => { e.target.style.display = "none"; }}
            />
            <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "60px", background: "linear-gradient(to top, rgba(13,17,23,0.9), transparent)" }} />
            {photos.length > 1 && (
              <div style={{ position: "absolute", bottom: "8px", left: "50%", transform: "translateX(-50%)", display: "flex", gap: "5px" }}>
                {photos.map((_, i) => (
                  <div key={i} onClick={() => setCurrentPhoto(i)} style={{
                    width: i === currentPhoto ? "18px" : "6px", height: "6px", borderRadius: "3px",
                    background: i === currentPhoto ? accent : "rgba(255,255,255,0.4)",
                    cursor: "pointer", transition: "all 0.3s ease"
                  }} />
                ))}
              </div>
            )}
          </>
        ) : (
          <NoPhotosPlaceholder accent={accent} />
        )}

        {/* Contador de fotos (único badge) */}
        <span
          style={{
            position: "absolute", top: "10px", right: "10px",
            background: "rgba(0,0,0,0.6)",
            color: accent,
            fontSize: "0.7rem",
            padding: "2px 8px",
            borderRadius: "20px",
            backdropFilter: "blur(4px)",
            zIndex: 2,
          }}
        >
          📷 {photos.length}
        </span>
      </div>

      {/* ── CUERPO ── */}
      <div className="p-3 d-flex flex-column" style={{ flex: 1 }}>
        {/* Nombre (altura fija, ellipsis si es largo) */}
        <h5 
          className="fw-bold mb-3" 
          style={{ 
            color: "#fff", 
            fontSize: "1rem", 
            lineHeight: "1.3",
            height: "2.6rem",
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
            textOverflow: "ellipsis"
          }}
        >
          {title}
        </h5>

        {/* Autor */}
        {showAuthor && author && (
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
            {author.avatar ? (
              <img 
                src={author.avatar} 
                alt={author.name} 
                style={{ 
                  width: "28px", 
                  height: "28px", 
                  borderRadius: "50%", 
                  objectFit: "cover", 
                  border: "1px solid rgba(255,255,255,0.06)",
                  flexShrink: 0
                }} 
              />
            ) : (
              <div style={{ 
                width: "28px", 
                height: "28px", 
                borderRadius: "50%", 
                display: "grid", 
                placeItems: "center", 
                background: accentGradient, 
                color: "#081018", 
                fontWeight: 800,
                fontSize: "0.75rem",
                flexShrink: 0
              }}>
                {author.name ? author.name.charAt(0).toUpperCase() : "A"}
              </div>
            )}
            {author.id ? (
              <Link 
                to={`/profile/${author.id}`} 
                style={{ 
                  color: accent, 
                  fontWeight: 700, 
                  textDecoration: "none", 
                  fontSize: "0.85rem",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap"
                }}
              >
                {author.name}
              </Link>
            ) : (
              <strong style={{ 
                color: accent, 
                fontWeight: 700, 
                fontSize: "0.85rem",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap"
              }}>{author.name}</strong>
            )}
          </div>
        )}

        {/* Fecha · Ubicación */}
        <div className="d-flex flex-wrap gap-3 mb-3" style={{ color: "rgba(255,255,255,0.45)", fontSize: "0.75rem", lineHeight: "1.4" }}>
          {date && <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>📅 {date}</span>}
          {location && <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>📍 {location}</span>}
        </div>

        {/* Botones de acción */}
        <div className="d-flex gap-2 mt-auto">
          <button
            onClick={handleView}
            className="btn btn-sm fw-bold rounded-pill flex-grow-1"
            style={{ 
              background: accentGradient, 
              border: "none", 
              color: "#000", 
              fontSize: "0.8rem",
              padding: "6px 16px",
              height: "34px"
            }}
          >
            📖 Ver detalle
          </button>

          {(showActions || onEdit) && (
            <button
              onClick={onEdit}
              className="btn btn-sm rounded-circle d-flex align-items-center justify-content-center"
              style={{
                background: `${accent}1a`, 
                color: accent,
                border: `1px solid ${accent}4d`,
                width: "34px", 
                height: "34px", 
                flexShrink: 0,
                padding: 0,
                fontSize: "0.9rem"
              }}
              title="Editar"
            >✏️</button>
          )}

          {(showActions || onDelete) && (
            <button
              onClick={onDelete}
              className="btn btn-sm rounded-circle d-flex align-items-center justify-content-center"
              style={{
                background: "rgba(220,53,69,0.15)", 
                color: "#ff6b7a",
                border: "1px solid rgba(220,53,69,0.4)",
                width: "34px", 
                height: "34px", 
                flexShrink: 0,
                padding: 0,
                fontSize: "0.9rem"
              }}
              title="Eliminar"
            >🗑️</button>
          )}
        </div>
      </div>
    </div>
  );
};

export default MediaCard;
