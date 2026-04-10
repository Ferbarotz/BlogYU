import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import getBackendURL from '../utils/backend';

import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

const TYPE_CONFIG = {
  vuelo:       { icon: '✈️', label: 'Vuelo',       colorStart: '#f9d423', colorEnd: '#ff6b35' },
  aeropuerto:  { icon: '🛫', label: 'Aeropuerto',  colorStart: '#f9d423', colorEnd: '#ff6b35' },
  vip:         { icon: '💎', label: 'VIP Lounge',  colorStart: '#f9d423', colorEnd: '#ff6b35' },
  hotel:       { icon: '🏨', label: 'Hotel',       colorStart: '#f9d423', colorEnd: '#ff6b35' },
  restaurante: { icon: '🍽️', label: 'Restaurante', colorStart: '#f9d423', colorEnd: '#ff6b35' },
  cafe:        { icon: '☕', label: 'Café',        colorStart: '#f9d423', colorEnd: '#ff6b35' },
  lugar:       { icon: '🗺️', label: 'Lugar',       colorStart: '#f9d423', colorEnd: '#ff6b35' },
  transporte:  { icon: '🚖', label: 'Transporte',  colorStart: '#f9d423', colorEnd: '#ff6b35' },
  otro:        { icon: '📍', label: 'Otro',        colorStart: '#f9d423', colorEnd: '#ff6b35' },
};

const Stars = ({ rating = 0 }) => (
  <span>
    {[1,2,3,4,5].map(i => (
      <span key={i} style={{ color: i <= rating ? 'url(#grad)' : 'rgba(255,255,255,0.2)', fontSize: '0.9rem' }}>★</span>
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
    <div className="d-flex justify-content-center align-items-center" style={{ minHeight: "100vh", background: "#0d1117" }}>
      <div className="text-center">
        <div className="spinner-border mb-3" style={{ color: "url(#grad)", width: "3rem", height: "3rem" }}></div>
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

      <div style={{ minHeight: "100vh", background: "#0d1117", color: "#e0e0e0" }} className="py-5">
        <div className="container" style={{ maxWidth: "900px" }}>
          <button
            onClick={() => navigate('/my-routes')}
            style={{ background: "transparent", border: "none", color: "#f9d423", cursor: "pointer", marginBottom: "24px", fontSize: "0.9rem" }}
          >
            ← Volver a mis rutas
          </button>

          {/* HEADER */}
          <div className="p-4 mb-4" style={{ background: "#121026", borderRadius: "20px", border: "1px solid #f9d42388", boxShadow: "0 0 15px #f9d42333" }}>
            <div className="d-flex justify-content-between align-items-start flex-wrap gap-3">
              <div>
                <h2 className="fw-black mb-2" style={{ color: "#f9d423", fontSize: "2rem" }}>
                  {route.title || 'Ruta'}
                </h2>
                <div className="d-flex flex-wrap gap-3" style={{ color: "#b0b0b0", fontSize: "0.9rem" }}>
                  <span>📍 {route.destination || '—'}</span>
                  {route.start_date && (
                    <span>
                      📅 {new Date(route.start_date).toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })}
                    </span>
                  )}
                  {route.budget && (
                    <span>💰 Presupuesto {route.budget}</span>
                  )}
                </div>
              </div>
              <div className="text-end">
                <small style={{ color: "#f9d423" }}>Publicado el</small>
                <p style={{ color: "#f9d423", margin: 0, fontSize: "0.85rem" }}>
                  {route.created_at ? new Date(route.created_at).toLocaleDateString('es-ES') : '—'}
                </p>
              </div>
            </div>

            {route.author && (
              <div className="mt-3 pt-3" style={{ borderTop: "1px solid #f9d42388" }}>
                <span style={{ color: "#f9d423", fontSize: "0.8rem" }}>✍️ Por </span>
                <Link to={`/profile/${route.author.id}`} style={{ color: "#f9d423", fontSize: "0.85rem", fontWeight: "600" }}>
                  {route.author.name || route.author.email}
                </Link>
              </div>
            )}
          </div>

          {/* RESUMEN STEPS */}
          {route.steps && route.steps.length > 0 && (
            <div className="mb-4 p-3" style={{ background: "#121026", borderRadius: "15px", border: "1px solid #f9d42344", boxShadow: "0 0 10px #f9d42322" }}>
              <p style={{ color: "#f9d423", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "2px", marginBottom: "12px" }}>
                Resumen del viaje — {route.steps.length} experiencia{route.steps.length !== 1 ? 's' : ''}
              </p>
              <div className="d-flex flex-wrap gap-2">
                {route.steps.map((step, i) => {
                  const cfg = TYPE_CONFIG[step.type] || TYPE_CONFIG.otro;
                  return (
                    <span key={i} className="px-3 py-1 rounded-pill" style={{ background: `linear-gradient(135deg, ${cfg.colorStart}33, ${cfg.colorEnd}33)`, color: cfg.colorStart, border: `1px solid ${cfg.colorStart}55`, fontSize: "0.8rem", textTransform: "none" }}>
                      {cfg.icon} {step.title}
                    </span>
                  );
                })}
              </div>
            </div>
          )}

          {/* MAPA */}
          {mapCenter ? (
            <div style={{ height: '400px', marginBottom: '2rem', borderRadius: '12px', overflow: 'hidden' }}>
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
          ) : (
            <div className="mb-4 p-3 text-center" style={{ background: "#121026", borderRadius: "12px", border: "1px solid #f9d42322", color: "#f9d423" }}>
              <p style={{ margin: 0 }}>No hay coordenadas disponibles para mostrar el mapa.</p>
            </div>
          )}

          {/* TIMELINE DE STEPS */}
          <h5 className="mb-4" style={{ color: "#f9d423" }}>📖 Diario de Experiencias</h5>

          <div style={{ position: "relative" }}>
            <div style={{
              position: "absolute", left: "22px", top: "0", bottom: "0",
              width: "2px", background: `linear-gradient(to bottom, #f9d423cc, #ff6b3533)`
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

              const normalized = rawImgs.map(fixImage).filter(Boolean);

              const seen = new Set();
              const photos = normalized.filter(url => {
                if (seen.has(url)) return false;
                seen.add(url);
                return true;
              });

              return (
                <div key={step.id || index} className="d-flex gap-4 mb-4" style={{ position: "relative" }}>
                  <div style={{
                    width: "46px", height: "46px", borderRadius: "50%", flexShrink: 0,
                    background: `linear-gradient(135deg, ${cfg.colorStart}33, ${cfg.colorEnd}33)`,
                    border: `2px solid ${cfg.colorStart}`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: "1.2rem", zIndex: 1
                  }}>
                    {cfg.icon}
                  </div>

                  <div className="flex-grow-1 p-4" style={{
                    background: "#121026",
                    borderRadius: "15px",
                    border: `1px solid ${cfg.colorStart}55`,
                    borderLeft: `3px solid ${cfg.colorStart}`,
                    boxShadow: `0 0 10px ${cfg.colorEnd}33`
                  }}>
                    <div className="d-flex justify-content-between align-items-start flex-wrap gap-2 mb-2">
                      <div>
                        <span className="badge px-2 py-1 me-2" style={{ background: `linear-gradient(135deg, ${cfg.colorStart}88, ${cfg.colorEnd}88)`, color: cfg.colorStart, fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "1px" }}>
                          {cfg.label}
                        </span>
                        <h6 className="d-inline fw-bold" style={{ color: "#f9d423" }}>{step.title}</h6>
                      </div>
                      <Stars rating={step.rating} />
                    </div>

                    {step.location && (
                      <p style={{ color: "#f9d423", fontSize: "0.8rem", marginBottom: "8px" }}>
                        📌 {step.location}
                      </p>
                    )}

                    {step.description && (
                      <p style={{ color: "#f9d423", fontSize: "0.9rem", marginBottom: "12px", lineHeight: "1.6" }}>
                        {step.description}
                      </p>
                    )}

                    {photos.length > 0 && (
                      <div className="d-flex flex-wrap gap-2 mt-2">
                        {photos.map((src, i) => (
                          <img
                            key={`${src}-${i}`}
                            src={src}
                            alt={`foto-${i}`}
                            style={{
                              width: "150px", height: "150px",
                              objectFit: "cover", borderRadius: "10px",
                              border: `1px solid ${cfg.colorStart}aa`,
                              cursor: "pointer"
                            }}
                            onError={(e) => { e.target.src = "https://placehold.co/150?text=Sin+imagen"; }}
                            onClick={() => openModal(photos, i)}
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
            <div className="text-center py-5" style={{ color: "#f9d423" }}>
              <p style={{ fontSize: "2rem" }}>📭</p>
              <p>Esta ruta no tiene experiencias registradas</p>
            </div>
          )}

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