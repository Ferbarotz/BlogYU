// src/front/pages/RouteDetail.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import getBackendURL from '../utils/backend';

import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

const TYPE_CONFIG = {
  vuelo:       { icon: '✈️', label: 'Vuelo',       color: '#4facfe' },
  aeropuerto:  { icon: '🛫', label: 'Aeropuerto',  color: '#00f2fe' },
  vip:         { icon: '💎', label: 'VIP Lounge',  color: '#f9d423' },
  hotel:       { icon: '🏨', label: 'Hotel',       color: '#a18cd1' },
  restaurante: { icon: '🍽️', label: 'Restaurante', color: '#f093fb' },
  cafe:        { icon: '☕', label: 'Café',        color: '#f5a623' },
  lugar:       { icon: '🗺️', label: 'Lugar',       color: '#43e97b' },
  transporte:  { icon: '🚖', label: 'Transporte',  color: '#fa709a' },
  otro:        { icon: '📍', label: 'Otro',        color: '#a1c4fd' },
};

const Stars = ({ rating = 0 }) => (
  <span>
    {[1,2,3,4,5].map(i => (
      <span key={i} style={{ color: i <= rating ? '#f9d423' : 'rgba(255,255,255,0.2)', fontSize: '0.9rem' }}>★</span>
    ))}
  </span>
);

// Helper: valida coordenada
const isValidCoord = (v) => v !== null && v !== undefined && v !== '' && Number.isFinite(Number(v));

// Helper: normaliza imagen
const fixImage = (img) => {
  if (!img) return null;
  if (typeof img === 'string') return img;
  if (img.url) return img.url;
  return null;
};

// Componente para ajustar bounds automáticamente
const FitBounds = ({ points = [] }) => {
  const map = useMap();
  useEffect(() => {
    if (!map) return;
    if (!points || points.length === 0) return;
    const bounds = points.map(p => [p.lat, p.lng]);
    try {
      map.fitBounds(bounds, { padding: [60, 60] });
    } catch (err) {
      // fallback: setView al primer punto
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

  useEffect(() => {
    const fetchRoute = async () => {
      const BACKEND = getBackendURL();
      try {
        const res = await fetch(`${BACKEND}/api/routes/${id}`);
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
    <div className="d-flex justify-content-center align-items-center" style={{ minHeight: "100vh", background: "#120b21" }}>
      <div className="text-center">
        <div className="spinner-border mb-3" style={{ color: "#a18cd1", width: "3rem", height: "3rem" }}></div>
        <p style={{ color: "#a89bc2" }}>Cargando ruta...</p>
      </div>
    </div>
  );

  if (error) return (
    <div className="d-flex justify-content-center align-items-center" style={{ minHeight: "100vh", background: "#120b21" }}>
      <div className="text-center">
        <p style={{ fontSize: "3rem" }}>😕</p>
        <h4 style={{ color: "#ff6b7a" }}>{error}</h4>
        <button onClick={() => navigate('/my-routes')} className="btn mt-3" style={{ background: "rgba(161,140,209,0.2)", color: "#e0d4ff", border: "1px solid rgba(161,140,209,0.4)", borderRadius: "10px" }}>
          ← Volver a mis rutas
        </button>
      </div>
    </div>
  );

  if (!route) return null;

  // Filtrar y normalizar pasos que tengan coords válidas
  const stepsWithCoords = (route.steps || [])
    .filter(s => isValidCoord(s.lat) && isValidCoord(s.lng))
    .map(s => ({ ...s, lat: Number(s.lat), lng: Number(s.lng) }));

  const mapCenter = stepsWithCoords.length > 0 ? [stepsWithCoords[0].lat, stepsWithCoords[0].lng] : null;

  return (
    <div style={{ minHeight: "100vh", background: "#120b21", color: "#fff" }} className="py-5">
      <div className="container" style={{ maxWidth: "900px" }}>

        <button
          onClick={() => navigate('/my-routes')}
          style={{ background: "transparent", border: "none", color: "#a89bc2", cursor: "pointer", marginBottom: "24px", fontSize: "0.9rem" }}
        >
          ← Volver a mis rutas
        </button>

        {/* HEADER */}
        <div className="p-4 mb-4" style={{ background: "rgba(255,255,255,0.04)", borderRadius: "20px", border: "1px solid rgba(161,140,209,0.3)" }}>
          <div className="d-flex justify-content-between align-items-start flex-wrap gap-3">
            <div>
              <h2 className="fw-black mb-2" style={{ color: "#ffffff", fontSize: "2rem" }}>
                {route.title || 'Ruta'}
              </h2>
              <div className="d-flex flex-wrap gap-3">
                <span style={{ color: "#ffc107", fontSize: "0.9rem" }}>📍 {route.destination || '—'}</span>
                {route.start_date && (
                  <span style={{ color: "#a89bc2", fontSize: "0.9rem" }}>
                    📅 {new Date(route.start_date).toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })}
                  </span>
                )}
                {route.budget && (
                  <span style={{ color: "#43e97b", fontSize: "0.9rem" }}>💰 Presupuesto {route.budget}</span>
                )}
              </div>
            </div>
            <div className="text-end">
              <small style={{ color: "#7a6e8a" }}>Publicado el</small>
              <p style={{ color: "#a89bc2", margin: 0, fontSize: "0.85rem" }}>
                {route.created_at ? new Date(route.created_at).toLocaleDateString('es-ES') : '—'}
              </p>
            </div>
          </div>

          {route.author && (
            <div className="mt-3 pt-3" style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}>
              <span style={{ color: "#7a6e8a", fontSize: "0.8rem" }}>✍️ Por </span>
              <span style={{ color: "#c9b8f0", fontSize: "0.85rem", fontWeight: "600" }}>{route.author.name || route.author.email}</span>
            </div>
          )}
        </div>

        {/* RESUMEN STEPS */}
        {route.steps && route.steps.length > 0 && (
          <div className="mb-4 p-3" style={{ background: "rgba(255,255,255,0.03)", borderRadius: "15px", border: "1px solid rgba(255,255,255,0.08)" }}>
            <p style={{ color: "#7a6e8a", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "2px", marginBottom: "12px" }}>
              Resumen del viaje — {route.steps.length} experiencia{route.steps.length !== 1 ? 's' : ''}
            </p>
            <div className="d-flex flex-wrap gap-2">
              {route.steps.map((step, i) => {
                const cfg = TYPE_CONFIG[step.type] || TYPE_CONFIG.otro;
                return (
                  <span key={i} className="px-3 py-1 rounded-pill" style={{ background: `${cfg.color}18`, color: cfg.color, border: `1px solid ${cfg.color}40`, fontSize: "0.8rem" }}>
                    {cfg.icon} {step.title}
                  </span>
                );
              })}
            </div>
          </div>
        )}

        {/* MAPA (solo si hay coordenadas válidas) */}
        {mapCenter ? (
          <div style={{ height: '400px', marginBottom: '2rem', borderRadius: '12px', overflow: 'hidden' }}>
            <MapContainer
              center={mapCenter}
              zoom={10}
              style={{ height: '100%', width: '100%' }}
              scrollWheelZoom={false}
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution="&copy; OpenStreetMap contributors"
              />
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
        ) : (
          <div className="mb-4 p-3 text-center" style={{ background: "rgba(255,255,255,0.02)", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.04)" }}>
            <p style={{ color: "#a89bc2", margin: 0 }}>No hay coordenadas disponibles para mostrar el mapa.</p>
          </div>
        )}

        {/* TIMELINE DE STEPS */}
        <h5 className="mb-4" style={{ color: "#ffc107" }}>📖 Diario de Experiencias</h5>

        <div style={{ position: "relative" }}>
          <div style={{
            position: "absolute", left: "22px", top: "0", bottom: "0",
            width: "2px", background: "linear-gradient(to bottom, #a18cd1, rgba(161,140,209,0.1))"
          }} />

          {route.steps && route.steps.map((step, index) => {
            const cfg = TYPE_CONFIG[step.type] || TYPE_CONFIG.otro;
            const photos = (step.images || []).map(fixImage).filter(Boolean);
            return (
              <div key={step.id || index} className="d-flex gap-4 mb-4" style={{ position: "relative" }}>
                {/* Ícono en la línea */}
                <div style={{
                  width: "46px", height: "46px", borderRadius: "50%", flexShrink: 0,
                  background: `${cfg.color}22`, border: `2px solid ${cfg.color}`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "1.2rem", zIndex: 1
                }}>
                  {cfg.icon}
                </div>

                {/* Contenido */}
                <div className="flex-grow-1 p-4" style={{
                  background: "rgba(255,255,255,0.04)",
                  borderRadius: "15px",
                  border: `1px solid ${cfg.color}30`,
                  borderLeft: `3px solid ${cfg.color}`
                }}>
                  <div className="d-flex justify-content-between align-items-start flex-wrap gap-2 mb-2">
                    <div>
                      <span className="badge px-2 py-1 me-2" style={{ background: `${cfg.color}22`, color: cfg.color, fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "1px" }}>
                        {cfg.label}
                      </span>
                      <h6 className="d-inline fw-bold" style={{ color: "#ffffff" }}>{step.title}</h6>
                    </div>
                    <Stars rating={step.rating} />
                  </div>

                  {step.location && (
                    <p style={{ color: "#a89bc2", fontSize: "0.8rem", marginBottom: "8px" }}>
                      📌 {step.location}
                    </p>
                  )}

                  {step.description && (
                    <p style={{ color: "#c9b8f0", fontSize: "0.9rem", marginBottom: "12px", lineHeight: "1.6" }}>
                      {step.description}
                    </p>
                  )}

                  {/* FOTOS DEL STEP */}
                  {photos.length > 0 && (
                    <div className="d-flex flex-wrap gap-2 mt-2">
                      {photos.map((src, i) => (
                        <img
                          key={i}
                          src={src}
                          alt={`foto-${i}`}
                          style={{
                            width: "150px", height: "150px",
                            objectFit: "cover", borderRadius: "10px",
                            border: `1px solid ${cfg.color}50`,
                            cursor: "pointer"
                          }}
                          onError={(e) => { e.target.src = "https://placehold.co/150?text=Sin+imagen"; }}
                          onClick={() => window.open(src, '_blank')}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {(!route.steps || route.steps.length === 0) && (
          <div className="text-center py-5" style={{ color: "#7a6e8a" }}>
            <p style={{ fontSize: "2rem" }}>📭</p>
            <p>Esta ruta no tiene experiencias registradas</p>
          </div>
        )}

      </div>
    </div>
  );
};

export default RouteDetail;