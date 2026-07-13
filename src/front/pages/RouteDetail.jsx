import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import 'leaflet/dist/leaflet.css';

import { API_BASE } from "../api/backend";

const TYPE_CONFIG = {
  vuelo: { icon: '✈️', label: 'Vuelo', colorStart: '#f9d423', colorEnd: '#ff6b35' },
  aeropuerto: { icon: '🛫', label: 'Aeropuerto', colorStart: '#f9d423', colorEnd: '#ff6b35' },
  vip: { icon: '💎', label: 'VIP Lounge', colorStart: '#f9d423', colorEnd: '#ff6b35' },
  hotel: { icon: '🏨', label: 'Hotel', colorStart: '#f9d423', colorEnd: '#ff6b35' },
  restaurante: { icon: '🍽️', label: 'Restaurante', colorStart: '#f9d423', colorEnd: '#ff6b35' },
  cafe: { icon: '☕', label: 'Café', colorStart: '#f9d423', colorEnd: '#ff6b35' },
  lugar: { icon: '🗺️', label: 'Lugar', colorStart: '#f9d423', colorEnd: '#ff6b35' },
  transporte: { icon: '🚖', label: 'Transporte', colorStart: '#f9d423', colorEnd: '#ff6b35' },
  otro: { icon: '📍', label: 'Otro', colorStart: '#f9d423', colorEnd: '#ff6b35' },
};

const Stars = ({ rating = 0 }) => (
  <span>
    {[1, 2, 3, 4, 5].map(i => (
      <span key={i} style={{ color: i <= rating ? '#f9d423' : 'rgba(255,255,255,0.2)', fontSize: '0.9rem' }}>★</span>
    ))}
  </span>
);

const isValidCoord = (v) => v !== null && v !== undefined && v !== '' && Number.isFinite(Number(v));

const fixImage = (img) => {
  if (!img) return null;
  if (typeof img === 'string') return img.trim();
  if (typeof img === 'object') {
    if (img.url) return String(img.url).trim();
    if (img.src) return String(img.src).trim();
    if (img.path) return String(img.path).trim();
    if (img.file && typeof img.file === 'string') return img.file.trim();
    if (img.file && img.file.url) return String(img.file.url).trim();
    if (img.image && typeof img.image === 'string') return img.image.trim();
    if (img.image && img.image.url) return String(img.image.url).trim();
    if (img.attributes && img.attributes.url) return String(img.attributes.url).trim();
    if (img.data && img.data.url) return String(img.data.url).trim();
    return null;
  }
  return null;
};

const makeAbsolute = (url) => {
  if (!url) return null;
  if (typeof url !== "string") return null;
  const trimmed = url.trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (trimmed.startsWith("//")) return `https:${trimmed}`;
  if (trimmed.startsWith("/")) {
    return (API_BASE ? API_BASE.replace(/\/$/, "") : window.location.origin.replace(/\/$/, "")) + trimmed;
  }
  try {
    return new URL(trimmed, window.location.origin).href;
  } catch (e) {
    return trimmed;
  }
};

const FitBounds = ({ points = [] }) => {
  const map = useMap();
  useEffect(() => {
    if (!map) return;
    if (!points || points.length === 0) return;
    const bounds = points.map(p => [p.lat, p.lng]);
    try {
      map.fitBounds(bounds, { padding: [60, 60] });
    } catch (err) {
      if (points[0]) map.setView([points[0].lat, points[0].lng], 10);
    }
  }, [map, points]);
  return null;
};

const RouteDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [route, setRoute] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalImgIndex, setModalImgIndex] = useState(0);
  const [modalPhotos, setModalPhotos] = useState([]);

  useEffect(() => {
    const fetchRoute = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/routes/${id}`);
        if (!res.ok) throw new Error('Ruta no encontrada');
        const data = await res.json();
        setRoute(data);
      } catch (err) {
        setError(err.message || 'Error al cargar la ruta');
      } finally {
        setLoading(false);
      }
    };
    fetchRoute();
  }, [id]);

  if (loading) return (
    <div className="d-flex justify-content-center align-items-center" style={{ minHeight: "100vh", background: "#0d1117" }}>
      <div className="text-center">
        <div className="spinner-border mb-3" style={{ color: "#f9d423", width: "3rem", height: "3rem" }}></div>
        <p style={{ color: "#f9d423" }}>Cargando ruta...</p>
      </div>
    </div>
  );

  if (error) return (
    <div className="d-flex justify-content-center align-items-center" style={{ minHeight: "100vh", background: "#0d1117" }}>
      <div className="text-center">
        <p style={{ fontSize: "3rem", color: "#f9d423" }}>😕</p>
        <h4 style={{ color: "#ff6b35" }}>{error}</h4>
        <button onClick={() => navigate('/my-routes')} className="btn mt-3" style={{ background: "linear-gradient(135deg, #f9d423 0%, #ff6b35 100%)", color: "#fff", border: "none", borderRadius: "10px" }}>
          ← Volver a mis rutas
        </button>
      </div>
    </div>
  );

  if (!route) return null;

  const stepsWithCoords = (route.steps || [])
    .filter(s => isValidCoord(s.lat) && isValidCoord(s.lng))
    .map(s => ({ ...s, lat: Number(s.lat), lng: Number(s.lng) }));

  const mapCenter = stepsWithCoords.length > 0 ? [stepsWithCoords[0].lat, stepsWithCoords[0].lng] : null;

  const openModal = (photos, index) => {
    setModalPhotos(photos);
    setModalImgIndex(index);
    setModalOpen(true);
  };
  const closeModal = () => setModalOpen(false);
  const prevPhoto = (e) => { e.stopPropagation(); setModalImgIndex(i => (i === 0 ? modalPhotos.length - 1 : i - 1)); };
  const nextPhoto = (e) => { e.stopPropagation(); setModalImgIndex(i => (i === modalPhotos.length - 1 ? 0 : i + 1)); };

  // Recopilar imágenes de la ruta (sin utilitarios externos)
  const imgs = (() => {
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
    });
    const normalized = arr.map(fixImage).filter(Boolean).map(makeAbsolute);
    const seen = new Set();
    const unique = [];
    for (const u of normalized) {
      if (!u) continue;
      if (!seen.has(u)) { seen.add(u); unique.push(u); }
    }
    return unique;
  })();

  const totalSteps = route.steps?.length || 0;
  const totalPhotos = imgs.length;

  return (
    <>
      <svg style={{ height: 0 }}>
        <defs>
          <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#f9d423" />
            <stop offset="100%" stopColor="#ff6b35" />
          </linearGradient>
        </defs>
      </svg>

      <div style={{
        margin: 0,
        paddingTop: '20px',
        paddingBottom: '40px',
        paddingLeft: '1rem',
        paddingRight: '1rem',
        background: "#0d1117",
        color: "#e0e0e0",
        minHeight: "100vh",
      }}>
        <div className="route-detail-container container" style={{ maxWidth: "1200px", marginTop: 0, paddingTop: 0 }}>
          <button
            onClick={() => navigate('/my-routes')}
            style={{ 
              background: "transparent", 
              border: "none", 
              color: "#f9d423", 
              cursor: "pointer", 
              marginBottom: "20px", 
              padding: "8px 0", 
              fontSize: "0.9rem",
              transition: "all 0.2s ease"
            }}
            onMouseOver={e => e.currentTarget.style.transform = "translateX(-5px)"}
            onMouseOut={e => e.currentTarget.style.transform = "translateX(0)"}
          >
            ← Volver a mis rutas
          </button>

          {/* HEADER CON HERO */}
          <div className="mb-4" style={{ 
            background: "linear-gradient(135deg, rgba(249,212,35,0.08) 0%, rgba(255,107,53,0.08) 100%)", 
            borderRadius: "24px", 
            border: "1px solid rgba(249,212,35,0.2)",
            boxShadow: "0 8px 32px rgba(249,212,35,0.15)",
            overflow: "hidden"
          }}>
            <div className="p-4 p-md-5">
              {/* Título principal */}
              <h1 className="fw-bold mb-3" style={{ 
                color: "#f9d423", 
                fontSize: "clamp(1.75rem, 4vw, 3rem)", 
                marginTop: 0,
                lineHeight: "1.2",
                textShadow: "0 2px 8px rgba(249,212,35,0.3)"
              }}>
                {route.title || 'Ruta sin título'}
              </h1>

              {/* Destino destacado */}
              <div className="d-flex align-items-center gap-2 mb-4">
                <span style={{ fontSize: "1.5rem" }}>📍</span>
                <h3 style={{ 
                  color: "rgba(255,255,255,0.9)", 
                  fontSize: "1.3rem", 
                  margin: 0,
                  fontWeight: 500
                }}>
                  {route.destination || 'Destino no especificado'}
                </h3>
              </div>

              {/* Stats Cards */}
              <div className="row g-3 mb-4">
                <div className="col-6 col-md-3">
                  <div style={{
                    background: "rgba(249,212,35,0.1)",
                    border: "1px solid rgba(249,212,35,0.3)",
                    borderRadius: "16px",
                    padding: "16px",
                    textAlign: "center"
                  }}>
                    <div style={{ fontSize: "2rem", marginBottom: "8px" }}>🗺️</div>
                    <div style={{ fontSize: "1.5rem", fontWeight: "700", color: "#f9d423" }}>{totalSteps}</div>
                    <div style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.6)", textTransform: "uppercase", letterSpacing: "1px" }}>
                      {totalSteps === 1 ? 'Parada' : 'Paradas'}
                    </div>
                  </div>
                </div>

                <div className="col-6 col-md-3">
                  <div style={{
                    background: "rgba(255,107,53,0.1)",
                    border: "1px solid rgba(255,107,53,0.3)",
                    borderRadius: "16px",
                    padding: "16px",
                    textAlign: "center"
                  }}>
                    <div style={{ fontSize: "2rem", marginBottom: "8px" }}>📸</div>
                    <div style={{ fontSize: "1.5rem", fontWeight: "700", color: "#ff6b35" }}>{totalPhotos}</div>
                    <div style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.6)", textTransform: "uppercase", letterSpacing: "1px" }}>
                      {totalPhotos === 1 ? 'Foto' : 'Fotos'}
                    </div>
                  </div>
                </div>

                <div className="col-6 col-md-3">
                  <div style={{
                    background: "rgba(249,212,35,0.1)",
                    border: "1px solid rgba(249,212,35,0.3)",
                    borderRadius: "16px",
                    padding: "16px",
                    textAlign: "center"
                  }}>
                    <div style={{ fontSize: "2rem", marginBottom: "8px" }}>📅</div>
                    <div style={{ fontSize: "0.9rem", fontWeight: "600", color: "#f9d423", lineHeight: "1.3" }}>
                      {route.created_at ? new Date(route.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                    </div>
                    <div style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.6)", textTransform: "uppercase", letterSpacing: "1px" }}>
                      Publicado
                    </div>
                  </div>
                </div>

                <div className="col-6 col-md-3">
                  <div style={{
                    background: "rgba(255,107,53,0.1)",
                    border: "1px solid rgba(255,107,53,0.3)",
                    borderRadius: "16px",
                    padding: "16px",
                    textAlign: "center"
                  }}>
                    <div style={{ fontSize: "2rem", marginBottom: "8px" }}>✨</div>
                    <div style={{ fontSize: "0.9rem", fontWeight: "600", color: "#ff6b35", lineHeight: "1.3" }}>
                      {route.budget || 'No definido'}
                    </div>
                    <div style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.6)", textTransform: "uppercase", letterSpacing: "1px" }}>
                      Presupuesto
                    </div>
                  </div>
                </div>
              </div>

              {/* Autor */}
              {route.author && (
                <div className="d-flex align-items-center gap-3 pt-3" style={{ 
                  borderTop: "1px solid rgba(249,212,35,0.2)"
                }}>
                  <div style={{
                    width: "48px",
                    height: "48px",
                    borderRadius: "50%",
                    background: "linear-gradient(135deg, #f9d423, #ff6b35)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "1.5rem",
                    fontWeight: "700",
                    color: "#000"
                  }}>
                    {(route.author.name || route.author.email || '?')[0].toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: "1px" }}>
                      Creado por
                    </div>
                    <Link 
                      to={`/profile/${route.author.id}`} 
                      style={{ 
                        color: "#f9d423", 
                        fontSize: "1rem", 
                        fontWeight: "600",
                        textDecoration: "none",
                        transition: "all 0.2s ease"
                      }}
                      onMouseOver={e => e.currentTarget.style.textShadow = "0 0 8px rgba(249,212,35,0.6)"}
                      onMouseOut={e => e.currentTarget.style.textShadow = "none"}
                    >
                      {route.author.name || route.author.email}
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* GALERÍA DE IMÁGENES */}
          {imgs.length > 0 && (
            <div className="mb-5">
              <h5 className="mb-3 d-flex align-items-center gap-2" style={{ color: "#f9d423", fontSize: "1.3rem" }}>
                <span>📸</span>
                Galería de la aventura
                <span style={{ 
                  fontSize: "0.8rem", 
                  fontWeight: 400, 
                  color: "rgba(255,255,255,0.5)",
                  background: "rgba(249,212,35,0.1)",
                  padding: "4px 12px",
                  borderRadius: "12px"
                }}>
                  {imgs.length} {imgs.length === 1 ? 'foto' : 'fotos'}
                </span>
              </h5>

              <div style={{
                display: "grid",
                gridTemplateColumns: imgs.length === 1 ? "1fr" : "repeat(auto-fill, minmax(200px, 1fr))",
                gap: "16px"
              }}>
                {imgs.map((src, i) => (
                  <div
                    key={i}
                    style={{
                      position: "relative",
                      aspectRatio: i === 0 && imgs.length > 1 ? "16/9" : "1/1",
                      gridColumn: i === 0 && imgs.length > 1 ? "span 2" : "span 1",
                      borderRadius: "16px",
                      overflow: "hidden",
                      cursor: "pointer",
                      border: i === 0 ? "2px solid #f9d423" : "1px solid rgba(249,212,35,0.2)",
                      boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
                      transition: "all 0.3s ease"
                    }}
                    onMouseOver={e => {
                      e.currentTarget.style.transform = "scale(1.02)";
                      e.currentTarget.style.boxShadow = "0 8px 24px rgba(249,212,35,0.3)";
                    }}
                    onMouseOut={e => {
                      e.currentTarget.style.transform = "scale(1)";
                      e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.3)";
                    }}
                    onClick={() => openModal(imgs, i)}
                  >
                    <img
                      src={src}
                      alt={`Foto ${i + 1}`}
                      style={{ 
                        width: "100%", 
                        height: "100%", 
                        objectFit: "cover"
                      }}
                      onError={(e) => { e.target.src = "https://placehold.co/400x400?text=Sin+imagen"; }}
                    />
                    {i === 0 && imgs.length > 1 && (
                      <div style={{
                        position: "absolute",
                        top: "12px",
                        left: "12px",
                        background: "linear-gradient(135deg, #f9d423, #ff6b35)",
                        color: "#000",
                        padding: "6px 12px",
                        borderRadius: "8px",
                        fontSize: "0.7rem",
                        fontWeight: "700",
                        textTransform: "uppercase",
                        letterSpacing: "1px",
                        boxShadow: "0 2px 8px rgba(0,0,0,0.3)"
                      }}>
                        ⭐ Destacada
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* MAPA */}
          {mapCenter ? (
            <div className="mb-5">
              <h5 className="mb-3 d-flex align-items-center gap-2" style={{ color: "#f9d423", fontSize: "1.3rem" }}>
                <span>🗺️</span>
                Recorrido en mapa
              </h5>
              <div style={{ 
                height: '450px', 
                borderRadius: '20px', 
                overflow: 'hidden',
                border: "2px solid rgba(249,212,35,0.2)",
                boxShadow: "0 8px 24px rgba(249,212,35,0.15)"
              }}>
                <MapContainer center={mapCenter} zoom={10} style={{ height: '100%', width: '100%' }} scrollWheelZoom={false}>
                  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap contributors" />
                  <FitBounds points={stepsWithCoords} />
                  {stepsWithCoords.map((step, i) => (
                    <Marker key={i} position={[step.lat, step.lng]}>
                      <Popup>
                        <strong>{step.title}</strong><br />
                        {step.description || '—'}
                      </Popup>
                    </Marker>
                  ))}
                </MapContainer>
              </div>
            </div>
          ) : null}

          {/* TIMELINE DE STEPS */}
          <div className="mb-4">
            <h5 className="mb-4 d-flex align-items-center gap-2" style={{ color: "#f9d423", fontSize: "1.3rem" }}>
              <span>🌍</span>
              Bitácora de la aventura
              <span style={{ 
                fontSize: "0.8rem", 
                fontWeight: 400, 
                color: "rgba(255,255,255,0.5)",
                background: "rgba(249,212,35,0.1)",
                padding: "4px 12px",
                borderRadius: "12px"
              }}>
                {totalSteps} {totalSteps === 1 ? 'parada' : 'paradas'}
              </span>
            </h5>

            <div style={{ position: "relative" }}>
              <div style={{
                position: "absolute", left: "28px", top: "0", bottom: "0",
                width: "3px", 
                background: `linear-gradient(to bottom, #f9d423, #ff6b35)`,
                borderRadius: "4px"
              }} />

            {route.steps && route.steps.map((step, index) => {
              const cfg = TYPE_CONFIG[step.type] || TYPE_CONFIG.otro;

              const rawImgs = [
                ...(Array.isArray(step.images) ? step.images : []),
                ...(Array.isArray(step.photos) ? step.photos : []),
                ...(Array.isArray(step.media) ? step.media : []),
                ...(Array.isArray(step.photos_urls) ? step.photos_urls : []),
                step.image ? [step.image] : [],
                step.photo ? [step.photo] : [],
              ].flat();

              const normalized = rawImgs.map(fixImage).filter(Boolean).map(makeAbsolute);

              const seen = new Set();
              const photos = normalized.filter(url => {
                if (seen.has(url)) return false;
                seen.add(url);
                return true;
              });

              return (
                <div key={step.id || index} className="d-flex gap-4 mb-5" style={{ position: "relative" }}>
                  <div style={{
                    width: "58px", 
                    height: "58px", 
                    borderRadius: "50%", 
                    flexShrink: 0,
                    background: `linear-gradient(135deg, ${cfg.colorStart}, ${cfg.colorEnd})`,
                    border: `3px solid rgba(13,17,23,1)`,
                    display: "flex", 
                    alignItems: "center", 
                    justifyContent: "center",
                    fontSize: "1.5rem", 
                    zIndex: 2,
                    boxShadow: `0 4px 16px ${cfg.colorStart}88`
                  }}>
                    {cfg.icon}
                  </div>

                  <div className="flex-grow-1 p-4" style={{
                    background: "linear-gradient(135deg, rgba(249,212,35,0.04) 0%, rgba(255,107,53,0.04) 100%)",
                    borderRadius: "20px",
                    border: `2px solid rgba(249,212,35,0.2)`,
                    boxShadow: `0 4px 20px rgba(0,0,0,0.3)`,
                    transition: "all 0.3s ease"
                  }}
                  onMouseOver={e => e.currentTarget.style.boxShadow = `0 8px 32px ${cfg.colorStart}44`}
                  onMouseOut={e => e.currentTarget.style.boxShadow = `0 4px 20px rgba(0,0,0,0.3)`}
                  >
                    <div className="mb-3">
                      <div className="d-flex align-items-center gap-2 mb-2">
                        <span style={{ 
                          background: `linear-gradient(135deg, ${cfg.colorStart}, ${cfg.colorEnd})`,
                          color: "#000",
                          padding: "4px 10px",
                          borderRadius: "8px",
                          fontSize: "0.7rem",
                          fontWeight: "700",
                          textTransform: "uppercase",
                          letterSpacing: "1.5px"
                        }}>
                          {cfg.label}
                        </span>
                        <span style={{
                          background: "rgba(249,212,35,0.1)",
                          color: "rgba(255,255,255,0.5)",
                          padding: "4px 10px",
                          borderRadius: "8px",
                          fontSize: "0.7rem",
                          fontWeight: "600"
                        }}>
                          PASO {index + 1}
                        </span>
                      </div>
                      
                      <h4 style={{ 
                        color: "#f9d423", 
                        fontSize: "1.4rem", 
                        fontWeight: "700",
                        marginBottom: "12px",
                        marginTop: "8px"
                      }}>
                        {step.title}
                      </h4>

                      <div className="d-flex flex-wrap align-items-center gap-3 mb-3">
                        {step.location && (
                          <span style={{ 
                            color: "rgba(255,255,255,0.7)", 
                            fontSize: "0.9rem",
                            display: "flex",
                            alignItems: "center",
                            gap: "6px"
                          }}>
                            <span style={{ fontSize: "1.1rem" }}>📌</span>
                            {step.location}
                          </span>
                        )}
                        {step.rating && (
                          <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                            <Stars rating={step.rating} />
                            <span style={{ 
                              color: "rgba(255,255,255,0.5)", 
                              fontSize: "0.85rem",
                              marginLeft: "4px"
                            }}>
                              ({step.rating}/5)
                            </span>
                          </div>
                        )}
                      </div>

                      {step.description && (
                        <p style={{ 
                          color: "rgba(255,255,255,0.8)", 
                          fontSize: "1rem", 
                          marginBottom: "16px", 
                          lineHeight: "1.7",
                          padding: "16px",
                          background: "rgba(0,0,0,0.2)",
                          borderRadius: "12px",
                          borderLeft: "3px solid #f9d423"
                        }}>
                          {step.description}
                        </p>
                      )}
                    </div>

                    {photos.length > 0 && (
                      <div>
                        <div style={{ 
                          color: "rgba(255,255,255,0.6)", 
                          fontSize: "0.85rem", 
                          marginBottom: "12px",
                          fontWeight: "600",
                          display: "flex",
                          alignItems: "center",
                          gap: "6px"
                        }}>
                          <span style={{ fontSize: "1rem" }}>📸</span>
                          {photos.length} {photos.length === 1 ? 'foto' : 'fotos'}
                        </div>
                        <div style={{
                          display: "grid",
                          gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
                          gap: "12px"
                        }}>
                          {photos.map((src, i) => (
                            <div
                              key={`${src}-${i}`}
                              style={{
                                position: "relative",
                                aspectRatio: "1/1",
                                borderRadius: "12px",
                                overflow: "hidden",
                                cursor: "pointer",
                                border: `2px solid ${cfg.colorStart}44`,
                                boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
                                transition: "all 0.3s ease"
                              }}
                              onMouseOver={e => {
                                e.currentTarget.style.transform = "scale(1.05)";
                                e.currentTarget.style.boxShadow = `0 6px 20px ${cfg.colorStart}66`;
                              }}
                              onMouseOut={e => {
                                e.currentTarget.style.transform = "scale(1)";
                                e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.3)";
                              }}
                              onClick={() => openModal(photos, i)}
                            >
                              <img
                                src={src}
                                alt={`foto-${i}`}
                                style={{
                                  width: "100%",
                                  height: "100%",
                                  objectFit: "cover"
                                }}
                                onError={(e) => { e.target.src = "https://placehold.co/200?text=Sin+imagen"; }}
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            </div>

            {(!route.steps || route.steps.length === 0) && (
              <div className="text-center py-5" style={{ color: "#f9d423" }}>
                <p style={{ fontSize: "2rem" }}>📭</p>
                <p>Esta ruta no tiene experiencias registradas</p>
              </div>
            )}
          </div>

          {/* Modal para fotos */}
          {modalOpen && (
            <div
              onClick={closeModal}
              style={{
                position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
                backgroundColor: "rgba(0,0,0,0.85)",
                display: "flex", justifyContent: "center", alignItems: "center",
                zIndex: 9999,
                cursor: "pointer"
              }}
            >
              <button
                onClick={prevPhoto}
                style={{
                  position: "absolute", left: "20px", top: "50%",
                  transform: "translateY(-50%)",
                  fontSize: "2.5rem", color: "#f9d423", background: "none", border: "none", cursor: "pointer"
                }}
                aria-label="Foto anterior"
              >
                ‹
              </button>

              <img
                src={modalPhotos[modalImgIndex]}
                alt={`Foto ampliada ${modalImgIndex + 1}`}
                style={{ maxHeight: "80vh", maxWidth: "80vw", borderRadius: "12px", boxShadow: "0 0 30px #f9d423" }}
                onClick={e => e.stopPropagation()}
              />

              <button
                onClick={nextPhoto}
                style={{
                  position: "absolute", right: "20px", top: "50%",
                  transform: "translateY(-50%)",
                  fontSize: "2.5rem", color: "#f9d423", background: "none", border: "none", cursor: "pointer"
                }}
                aria-label="Foto siguiente"
              >
                ›
              </button>
            </div>
          )}

        </div>
      </div>
    </>
  );
};

export default RouteDetail;