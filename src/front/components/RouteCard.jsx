// src/front/components/RouteCard.jsx
import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { API_BASE } from "../api/backend";

// Helpers locales
const makeAbsolute = (url) => {
  if (!url) return null;
  if (typeof url !== "string") return null;
  const trimmed = url.trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (trimmed.startsWith("//")) return `https:${trimmed}`;
  if (trimmed.startsWith("/")) {
    const base = (API_BASE && API_BASE !== "") ? API_BASE.replace(/\/$/, "") : window.location.origin.replace(/\/$/, "");
    return `${base}${trimmed}`;
  }
  try {
    return new URL(trimmed, window.location.origin).href;
  } catch (e) {
    return trimmed;
  }
};

const extractUrl = (img) => {
  if (!img) return null;
  if (typeof img === "string") return img;
  if (typeof img === "object") {
    return img.url || img.src || img.path || img.file || (img.image && (img.image.url || img.image.path)) || null;
  }
  return null;
};

const getAuthor = (r = {}) => {
  const source = r.user || r.author || r.created_by || (r.user_name ? { name: r.user_name } : null) || null;
  const name =
    (source && (source.name || source.username)) ||
    r.user_name || r.author_name || r.username ||
    (typeof r.author === "string" ? r.author : null) ||
    "Anónimo";
  const avatar = (source && (source.avatar || source.picture || source.photo)) || r.user_avatar || r.avatar || null;
  const id = (source && (source.id || source._id)) || null;
  return { name, avatar, id };
};

const RouteCard = ({ route = {}, onView, maxPhotos = 6 }) => {
  const [currentPhoto, setCurrentPhoto] = useState(0);

  // Recolecta imágenes desde distintos campos que tu API puede devolver (sin recortar)
  const collectRawImages = () => {
    const arr = [];
    if (Array.isArray(route.images)) arr.push(...route.images);
    if (Array.isArray(route.photos)) arr.push(...route.photos);
    if (route.image) arr.push(route.image);
    if (route.photo) arr.push(route.photo);
    (route.steps || []).forEach(s => {
      if (s && Array.isArray(s.images)) arr.push(...s.images);
      if (s && Array.isArray(s.photos)) arr.push(...s.photos);
      if (s && s.image) arr.push(s.image);
      if (s && s.photo) arr.push(s.photo);
      if (s && Array.isArray(s.media)) arr.push(...s.media);
    });
    return arr;
  };

  // Normaliza/extrae y convierte a URLs absolutas, dejando sólo únicas (array completo)
  const allUniquePhotos = (() => {
    const raw = collectRawImages()
      .map(extractUrl)
      .filter(Boolean)
      .map(makeAbsolute);
    const seen = new Set();
    const unique = [];
    for (const u of raw) {
      if (!u) continue;
      if (!seen.has(u)) {
        seen.add(u);
        unique.push(u);
      }
    }
    return unique;
  })();

  const photosCount = allUniquePhotos.length;                 // total real de imágenes
  const displayMax = Number.isFinite(Number(maxPhotos)) ? Number(maxPhotos) : 6;
  const photos = allUniquePhotos.slice(0, displayMax);       // las que realmente mostramos en miniaturas
  const cover = allUniquePhotos.length ? allUniquePhotos[0] : "/placeholder-150.png";

  useEffect(() => {
    if (photos.length <= 1) return;
    const id = setInterval(() => setCurrentPhoto(p => (p + 1) % photos.length), 3000);
    return () => clearInterval(id);
  }, [photos.length]);

  const stepIcons = { vuelo: "✈️", hotel: "🏨", restaurante: "🍽️", bar: "🍹", lugar: "📍" };
  const { name: authorName, avatar, id: authorId } = getAuthor(route || {});

  const handleViewClick = () => {
    if (typeof onView === "function") onView();
  };

  return (
    <>
      <div
        className="h-100 rounded-4 overflow-hidden"
        style={{
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.08)",
          display: "flex", flexDirection: "column",
          transition: "all 0.3s ease"
        }}
        onMouseOver={(e) => e.currentTarget.style.border = "1px solid rgba(249,212,35,0.5)"}
        onMouseOut={(e) => e.currentTarget.style.border = "1px solid rgba(255,255,255,0.08)"}
      >
        <div style={{ height: "180px", background: "#1a1a2e", position: "relative", overflow: "hidden" }}>
          {photos.length > 0 ? (
            <>
              <img
                src={photos[currentPhoto]}
                alt={route.title}
                style={{ width: "100%", height: "100%", objectFit: "cover", transition: "opacity 0.6s ease" }}
                onError={(e) => { e.target.style.display = "none"; }}
              />
              {photos.length > 1 && (
                <div style={{ position: "absolute", bottom: "8px", left: "50%", transform: "translateX(-50%)", display: "flex", gap: "4px" }}>
                  {photos.map((_, i) => (
                    <div key={i} style={{
                      width: i === currentPhoto ? "12px" : "4px", height: "4px", borderRadius: "2px",
                      background: i === currentPhoto ? "#f9d423" : "rgba(255,255,255,0.4)",
                      transition: "all 0.3s ease"
                    }} />
                  ))}
                </div>
              )}
              {(photosCount > 0 || route.photos_count > 0 || route.images_count > 0) && (
                <span style={{
                  position: "absolute", top: "10px", right: "10px",
                  background: "rgba(0,0,0,0.6)", color: "#f9d423",
                  fontSize: "0.65rem", padding: "2px 8px", borderRadius: "20px", backdropFilter: "blur(4px)"
                }}>
                  📷 {photosCount || route.photos_count || route.images_count || 0}
                </span>
              )}
            </>
          ) : (
            <div style={{ height: "100%", display: "grid", placeItems: "center" }}>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: "40px" }}>🗺️</div>
                <div style={{ fontSize: "10px", color: "rgba(255,255,255,0.2)", letterSpacing: "2px" }}>SIN FOTOS</div>
              </div>
            </div>
          )}

          <span style={{
            position: "absolute", top: "10px", left: "10px",
            background: "rgba(0,0,0,0.6)", color: "#f9d423",
            border: "1px solid rgba(249,212,35,0.5)",
            fontSize: "0.65rem", padding: "3px 10px", borderRadius: "20px", fontWeight: "bold", backdropFilter: "blur(4px)"
          }}>📍 {route.destination || "Ruta"}</span>

          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "40px", background: "linear-gradient(to top, rgba(13,17,23,0.8), transparent)" }} />
        </div>

        <div className="p-3 d-flex flex-column" style={{ flex: 1 }}>
          <div className="d-flex justify-content-between align-items-start mb-2">
            <h5 className="fw-bold mb-0" style={{ color: "#fff", fontSize: "0.95rem", lineHeight: "1.3" }}>{route.title}</h5>
            <small style={{ color: "rgba(255,255,255,0.3)", fontSize: "0.65rem", whiteSpace: "nowrap", marginLeft: "8px" }}>
              {route.created_at ? new Date(route.created_at).toLocaleDateString() : ""}
            </small>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
            {avatar ? (
              <img src={makeAbsolute(extractUrl(avatar))} alt={authorName} style={{ width: 28, height: 28, borderRadius: "50%", objectFit: "cover", border: "1px solid rgba(255,255,255,0.06)" }} />
            ) : (
              <div style={{ width: 28, height: 28, borderRadius: "50%", display: "grid", placeItems: "center", background: "linear-gradient(135deg,#f9d423,#ff4e50)", color: "#081018", fontWeight: 800 }}>
                {authorName ? authorName.charAt(0).toUpperCase() : "A"}
              </div>
            )}
            {authorId ? (
              <Link
                to={`/profile/${authorId}`}
                style={{ color: "#f9d423", fontWeight: 800, textDecoration: "underline", fontSize: "0.82rem" }}
              >
                {authorName}
              </Link>
            ) : (
              <strong style={{ color: "#f9d423", fontWeight: 800, fontSize: "0.82rem" }}>{authorName}</strong>
            )}
          </div>

          <p style={{
            color: "rgba(255,255,255,0.5)", fontSize: "0.78rem", lineHeight: "1.4",
            display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
            overflow: "hidden", marginBottom: "8px"
          }}>{route.description || "Sin descripción"}</p>

          {route.steps?.length > 0 && (
            <div className="d-flex flex-wrap gap-1 mb-2">
              {route.steps.slice(0, 2).map((s, i) => (
                <span key={i} style={{
                  background: "rgba(249,212,35,0.08)", color: "rgba(255,255,255,0.5)",
                  border: "1px solid rgba(249,212,35,0.2)",
                  fontSize: "0.65rem", padding: "2px 8px", borderRadius: "20px"
                }}>{stepIcons[s.type] || "📍"} {s.title}</span>
              ))}
              {route.steps.length > 2 && (
                <span style={{ color: "rgba(255,255,255,0.3)", fontSize: "0.65rem", alignSelf: "center" }}>+{route.steps.length - 2}</span>
              )}
            </div>
          )}

          <div className="d-flex gap-3 mb-3" style={{ color: "rgba(255,255,255,0.35)", fontSize: "0.72rem" }}>
            {route.steps?.length > 0 && (
              <span>🗂️ {route.steps.length} parada{route.steps.length !== 1 ? "s" : ""}</span>
            )}
            {photosCount > 0 && (
              <span>📷 {photosCount} foto{photosCount !== 1 ? "s" : ""}</span>
            )}
          </div>

          <div className="mt-auto">
            <button
              onClick={handleViewClick}
              className="btn btn-sm fw-bold rounded-pill w-100"
              style={{ background: "linear-gradient(135deg, #f9d423 0%, #ff4e50 100%)", border: "none", color: "#000", fontSize: "0.78rem" }}
            >🗺️ Ver ruta</button>
          </div>
        </div>
      </div>
    </>
  );
};

export default RouteCard;