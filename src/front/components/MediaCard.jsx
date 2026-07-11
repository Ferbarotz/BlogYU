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
      {/* ── 1. CABECERA: categoría (izq) + nº fotos (der) ── */}
      <div
        className="d-flex justify-content-between align-items-center"
        style={{
          padding: "10px 12px",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <span
          style={{
            background: `${accent}26`,
            color: accent,
            border: `1px solid ${accent}66`,
            fontSize: "0.72rem",
            padding: "3px 10px",
            borderRadius: "20px",
            fontWeight: "bold",
            whiteSpace: "nowrap",
          }}
        >
          {categoryIcon} {categoryLabel}
        </span>

        <span
          style={{
            background: "rgba(0,0,0,0.5)",
            color: accent,
            fontSize: "0.72rem",
            padding: "3px 10px",
            borderRadius: "20px",
            whiteSpace: "nowrap",
          }}
        >
          📷 {photos.length}
        </span>
      </div>

      {/* ── 2. FOTOS ── */}
      <div style={{ position: "relative", height: "200px", background: "#1a1a2e", overflow: "hidden" }}>
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
      </div>

      {/* ── CUERPO ── */}
      <div className="p-3 d-flex flex-column" style={{ flex: 1 }}>
        {/* 3. Nombre */}
        <h5 className="fw-bold mb-2" style={{ color: "#fff", fontSize: "1rem", lineHeight: "1.3" }}>
          {title}
        </h5>

        {/* 4. Autor */}
        {showAuthor && author && (
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
            {author.avatar ? (
              <img src={author.avatar} alt={author.name} style={{ width: 28, height: 28, borderRadius: "50%", objectFit: "cover", border: "1px solid rgba(255,255,255,0.06)" }} />
            ) : (
              <div style={{ width: 28, height: 28, borderRadius: "50%", display: "grid", placeItems: "center", background: accentGradient, color: "#081018", fontWeight: 800 }}>
                {author.name ? author.name.charAt(0).toUpperCase() : "A"}
              </div>
            )}
            {author.id ? (
              <Link to={`/profile/${author.id}`} style={{ color: accent, fontWeight: 800, textDecoration: "underline", cursor: "pointer", fontSize: "0.82rem" }}>
                {author.name}
              </Link>
            ) : (
              <strong style={{ color: accent, fontWeight: 800, fontSize: "0.82rem" }}>{author.name}</strong>
            )}
          </div>
        )}

        {/* 5. Fecha · Ubicación */}
        <div className="d-flex flex-wrap gap-3 mb-3" style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.75rem" }}>
          {date && <span>📅 {date}</span>}
          {location && <span>📍 {location}</span>}
        </div>

        {/* 6. Ver detalle · Editar · Borrar */}
        <div className="d-flex gap-2 mt-auto">
          <button
            onClick={handleView}
            className="btn btn-sm fw-bold rounded-pill flex-grow-1"
            style={{ background: accentGradient, border: "none", color: "#000", fontSize: "0.8rem" }}
          >
            📖 Ver detalle
          </button>

          {(showActions || onEdit) && (
            <button
              onClick={onEdit}
              className="btn btn-sm rounded-circle d-flex align-items-center justify-content-center"
              style={{
                background: `${accent}1a`, color: accent,
                border: `1px solid ${accent}4d`,
                width: "34px", height: "34px", flexShrink: 0
              }}
              title="Editar"
            >✏️</button>
          )}

          {(showActions || onDelete) && (
            <button
              onClick={onDelete}
              className="btn btn-sm rounded-circle d-flex align-items-center justify-content-center"
              style={{
                background: "rgba(220,53,69,0.15)", color: "#ff6b7a",
                border: "1px solid rgba(220,53,69,0.4)",
                width: "34px", height: "34px", flexShrink: 0
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
