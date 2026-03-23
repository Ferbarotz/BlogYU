// src/front/components/RouteCard.jsx
import React, { useState, useEffect } from "react";
import { API_BASE } from "../api/backend";

const fixImage = (img) => {
  if (!img) return null;
  if (typeof img === "string" && img.startsWith("/")) return `${API_BASE}${img}`;
  return img;
};

const RouteCard = ({ route, onView }) => {
  const [currentPhoto, setCurrentPhoto] = useState(0);

  // Extraemos todas las fotos de todos los steps de la ruta
  const photos = (route.steps || [])
    .flatMap(s => (s.images || []).map(img => img.url || img).concat(s.photos || []))
    .map(fixImage)
    .filter(Boolean);

  // Efecto para el carrusel automático si hay más de una foto
  useEffect(() => {
    if (photos.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentPhoto(prev => (prev + 1) % photos.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [photos.length]);

  const stepIcons = { vuelo: "✈️", hotel: "🏨", restaurante: "🍽️", bar: "🍹", lugar: "📍" };

  return (
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
      {/* SECCIÓN DE IMAGEN */}
      <div style={{ height: "180px", background: "#1a1a2e", position: "relative", overflow: "hidden" }}>
        {photos.length > 0 ? (
          <>
            <img
              src={photos[currentPhoto]}
              alt={route.title}
              style={{ width: "100%", height: "100%", objectFit: "cover", transition: "opacity 0.6s ease" }}
              onError={(e) => { e.target.style.display = "none"; }}
            />
            {/* Indicadores de carrusel */}
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
          </>
        ) : (
          <div style={{ height: "100%", display: "grid", placeItems: "center" }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "40px" }}>🗺️</div>
              <div style={{ fontSize: "10px", color: "rgba(255,255,255,0.2)", letterSpacing: "2px" }}>SIN FOTOS</div>
            </div>
          </div>
        )}

        {/* Badge de Destino */}
        <span style={{
          position: "absolute", top: "10px", left: "10px",
          background: "rgba(0,0,0,0.6)", color: "#f9d423",
          border: "1px solid rgba(249,212,35,0.5)",
          fontSize: "0.65rem", padding: "3px 10px", borderRadius: "20px", fontWeight: "bold", backdropFilter: "blur(4px)"
        }}>📍 {route.destination || "Ruta"}</span>
        
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "40px", background: "linear-gradient(to top, rgba(13,17,23,0.8), transparent)" }} />
      </div>

      {/* CUERPO */}
      <div className="p-3 d-flex flex-column" style={{ flex: 1 }}>
        <div className="d-flex justify-content-between align-items-start mb-2">
          <h5 className="fw-bold mb-0" style={{ color: "#fff", fontSize: "0.95rem", lineHeight: "1.3" }}>{route.title}</h5>
          <small style={{ color: "rgba(255,255,255,0.3)", fontSize: "0.65rem", whiteSpace: "nowrap", marginLeft: "8px" }}>
            {route.created_at ? new Date(route.created_at).toLocaleDateString() : ""}
          </small>
        </div>

        <p style={{
          color: "rgba(255,255,255,0.5)", fontSize: "0.78rem", lineHeight: "1.4",
          display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
          overflow: "hidden", marginBottom: "12px"
        }}>{route.description || "Sin descripción"}</p>

        {route.steps?.length > 0 && (
          <div className="d-flex flex-wrap gap-1 mb-3">
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

        <div className="mt-auto">
          <button
            onClick={onView}
            className="btn btn-sm fw-bold rounded-pill w-100"
            style={{ background: "linear-gradient(135deg, #f9d423 0%, #ff4e50 100%)", border: "none", color: "#000", fontSize: "0.78rem" }}
          >🗺️ Ver ruta</button>
        </div>
      </div>
    </div>
  );
};

export default RouteCard;