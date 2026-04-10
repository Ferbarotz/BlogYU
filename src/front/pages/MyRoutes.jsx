// src/front/pages/MyRoutes.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_BASE, authHeaders } from '../api/backend';

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------
const makeAbsoluteUrl = (raw) => {
  if (!raw) return null;
  if (typeof raw === 'object') {
    raw = raw.url || raw.path || raw.file || raw.src || raw.image || raw;
  }
  if (typeof raw !== 'string') return null;
  raw = raw.trim();
  if (/^https?:\/\//i.test(raw)) return raw;
  if (raw.startsWith('//')) return `https:${raw}`;
  const baseCandidate = (API_BASE && API_BASE.length > 0)
    ? API_BASE.replace(/\/$/, '')
    : window.location.origin.replace(/\/$/, '');
  try {
    return new URL(raw, baseCandidate).href;
  } catch (err) {
    return `${baseCandidate}/${raw.replace(/^\/+/, '')}`;
  }
};

// -----------------------------------------------------------------------------
// PLACEHOLDER SIN FOTOS
// -----------------------------------------------------------------------------
const NoPhotosCarousel = () => {
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setIdx((p) => (p + 1) % 4), 2500);
    return () => clearInterval(id);
  }, []);

  const slides = [
    <div key="0" style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center" }}>
      <div style={{ textAlign: "center", color: "rgba(255,255,255,0.65)", position: "relative", zIndex: 1 }}>
        <div style={{ fontSize: "44px", marginBottom: "8px" }}>🗺️</div>
        <div style={{ fontWeight: 800, letterSpacing: "2px", fontSize: "11px", color: "rgba(255,255,255,0.45)" }}>VISTA MAPA</div>
        <div style={{ fontSize: "11px", marginTop: "4px", color: "rgba(255,255,255,0.35)" }}>Añade fotos para darle vida</div>
      </div>
      <div style={{ position: "absolute", left: "18px", right: "18px", top: "50%", height: "1px", borderTop: "2px dashed rgba(249,212,35,0.3)" }} />
      <div style={{ position: "absolute", left: "22px", top: "calc(50% - 12px)", fontSize: "20px" }}>📍</div>
      <div style={{ position: "absolute", right: "22px", top: "calc(50% - 12px)", fontSize: "20px" }}>🏁</div>
    </div>,
    <div key="1" style={{ position: "absolute", inset: 0 }}>
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(circle at 20% 30%, rgba(249,212,35,0.2), transparent 50%), radial-gradient(circle at 75% 25%, rgba(0,242,254,0.15), transparent 50%)" }} />
      <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "44px", marginBottom: "8px" }}>🏔️</div>
          <div style={{ fontWeight: 800, letterSpacing: "2px", fontSize: "11px", color: "rgba(255,255,255,0.45)" }}>PAISAJE</div>
          <div style={{ fontSize: "11px", marginTop: "4px", color: "rgba(255,255,255,0.35)" }}>Convierte esto en una galería</div>
        </div>
      </div>
    </div>,
    <div key="2" style={{ position: "absolute", inset: 0 }}>
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(135deg, rgba(0,242,254,0.15), rgba(249,212,35,0.15), rgba(255,78,80,0.1))" }} />
      <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "44px", marginBottom: "8px" }}>✈️</div>
          <div style={{ fontWeight: 800, letterSpacing: "2px", fontSize: "11px", color: "rgba(255,255,255,0.45)" }}>EN VUELO</div>
          <div style={{ fontSize: "11px", marginTop: "4px", color: "rgba(255,255,255,0.35)" }}>Sube fotos de tus paradas</div>
        </div>
      </div>
    </div>,
    <div key="3" style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center" }}>
      <div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 56px)", gap: "10px", marginBottom: "10px" }}>
          {["📍", "🏨", "🍽️", "🗿"].map((ic, i) => (
            <div key={i} style={{
              width: "56px", height: "56px", display: "grid", placeItems: "center",
              borderRadius: "14px", background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.1)", fontSize: "24px"
            }}>{ic}</div>
          ))}
        </div>
        <div style={{ textAlign: "center", color: "rgba(255,255,255,0.35)", fontSize: "11px", letterSpacing: "1px" }}>VISTA TEMÁTICA</div>
      </div>
    </div>
  ];

  return (
    <div style={{ position: "relative", height: "180px", background: "#1a1a2e", overflow: "hidden" }}>
      {slides[idx]}
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "50px", background: "linear-gradient(to top, rgba(13,17,23,0.9), transparent)" }} />
      <div style={{ position: "absolute", bottom: "8px", left: "50%", transform: "translateX(-50%)", display: "flex", gap: "6px", zIndex: 2 }}>
        {[0, 1, 2, 3].map((d) => (
          <div key={d} onClick={() => setIdx(d)} style={{
            width: d === idx ? "18px" : "6px", height: "6px", borderRadius: "3px",
            background: d === idx ? "#f9d423" : "rgba(255,255,255,0.35)",
            cursor: "pointer", transition: "all 0.25s ease"
          }} />
        ))}
      </div>
    </div>
  );
};

// -----------------------------------------------------------------------------
// RouteCard
// -----------------------------------------------------------------------------
const RouteCard = ({ route, onDelete, onView, onEdit }) => {
  const [currentPhoto, setCurrentPhoto] = useState(0);

  const gatherImagesFromStep = (s) => {
    if (!s) return [];
    let imgs = [];
    if (Array.isArray(s.images)) imgs = imgs.concat(s.images);
    if (Array.isArray(s.photos)) imgs = imgs.concat(s.photos);
    if (Array.isArray(s.photos_urls)) imgs = imgs.concat(s.photos_urls);
    if (s.image) imgs.push(s.image);
    if (s.photo) imgs.push(s.photo);
    if (s.url) imgs.push(s.url);
    return imgs;
  };

  // ✅ CAMBIO: deduplicar + limitar a 20 fotos reales
  const photos = (() => {
    const raw = [
      ...(route.images || []),
      ...(route.photos || []),
      ...(route.image ? [route.image] : []),
      ...(route.photo ? [route.photo] : []),
      ...((route.steps || []).flatMap(gatherImagesFromStep))
    ]
      .map(img => {
        if (img && typeof img === 'object') return img.url || img.path || img.file || img.src || null;
        return img;
      })
      .map(makeAbsoluteUrl)
      .filter(Boolean);

    // deduplicar manteniendo orden
    const seen = new Set();
    const unique = [];
    for (const u of raw) {
      if (!seen.has(u)) {
        seen.add(u);
        unique.push(u);
      }
    }
    return unique.slice(0, 20); // ✅ máximo 20
  })();

  useEffect(() => {
    if (photos.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentPhoto(prev => (prev + 1) % photos.length);
    }, 2500);
    return () => clearInterval(interval);
  }, [photos.length]);

  const stepIcons = { vuelo: "✈️", hotel: "🏨", restaurante: "🍽️", bar: "🍹", lugar: "📍" };

  return (
    <div
      className="h-100 rounded-4 overflow-hidden"
      style={{
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.08)",
        transition: "all 0.3s ease",
        display: "flex", flexDirection: "column"
      }}
      onMouseOver={(e) => e.currentTarget.style.border = "1px solid rgba(249,212,35,0.5)"}
      onMouseOut={(e) => e.currentTarget.style.border = "1px solid rgba(255,255,255,0.08)"}
    >
      {/* ÁREA DE FOTO */}
      <div style={{ position: "relative", height: "180px", background: "#1a1a2e", overflow: "hidden" }}>
        {photos.length > 0 ? (
          <>
            <img
              src={photos[currentPhoto]}
              alt="foto ruta"
              style={{ width: "100%", height: "100%", objectFit: "cover", transition: "opacity 0.6s ease" }}
              onError={(e) => { e.target.style.display = "none"; }}
            />
            <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "60px", background: "linear-gradient(to top, rgba(13,17,23,0.9), transparent)" }} />
            {photos.length > 1 && (
              <div style={{ position: "absolute", bottom: "8px", left: "50%", transform: "translateX(-50%)", display: "flex", gap: "5px" }}>
                {photos.map((_, i) => (
                  <div key={i} onClick={() => setCurrentPhoto(i)} style={{
                    width: i === currentPhoto ? "18px" : "6px", height: "6px", borderRadius: "3px",
                    background: i === currentPhoto ? "#f9d423" : "rgba(255,255,255,0.4)",
                    cursor: "pointer", transition: "all 0.3s ease"
                  }} />
                ))}
              </div>
            )}
            <span style={{
              position: "absolute", top: "10px", right: "10px",
              background: "rgba(0,0,0,0.6)", color: "#f9d423",
              fontSize: "0.7rem", padding: "2px 8px", borderRadius: "20px", backdropFilter: "blur(4px)"
            }}>📷 {photos.length}</span>
          </>
        ) : (
          <NoPhotosCarousel />
        )}
        <span style={{
          position: "absolute", top: "10px", left: "10px",
          background: "rgba(249,212,35,0.2)", color: "#f9d423",
          border: "1px solid rgba(249,212,35,0.5)",
          fontSize: "0.7rem", padding: "3px 10px", borderRadius: "20px",
          backdropFilter: "blur(4px)", fontWeight: "bold", zIndex: 2
        }}>📍 {route.destination}</span>
      </div>

      {/* CUERPO */}
      <div className="p-3 d-flex flex-column" style={{ flex: 1 }}>
        <div className="d-flex justify-content-between align-items-start mb-2">
          <h5 className="fw-bold mb-0" style={{ color: "#fff", fontSize: "1rem", lineHeight: "1.3" }}>
            {route.title}
          </h5>
          <small style={{ color: "rgba(255,255,255,0.3)", fontSize: "0.7rem", whiteSpace: "nowrap", marginLeft: "8px" }}>
            {route.created_at ? new Date(route.created_at).toLocaleDateString() : ""}
          </small>
        </div>

        {route.description && (
          <p style={{
            color: "rgba(255,255,255,0.5)", fontSize: "0.8rem",
            marginBottom: "12px", lineHeight: "1.4",
            display: "-webkit-box", WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical", overflow: "hidden"
          }}>
            {route.description}
          </p>
        )}

        {route.steps && route.steps.length > 0 && (
          <div className="d-flex flex-wrap gap-1 mb-3">
            {route.steps.slice(0, 4).map((step, i) => (
              <span key={i} style={{
                background: "rgba(0,242,254,0.07)", color: "rgba(255,255,255,0.55)",
                border: "1px solid rgba(0,242,254,0.15)",
                fontSize: "0.7rem", padding: "2px 8px", borderRadius: "20px"
              }}>
                {stepIcons[step.type] || "📍"} {step.title}
              </span>
            ))}
            {route.steps.length > 4 && (
              <span style={{ color: "rgba(255,255,255,0.3)", fontSize: "0.7rem", alignSelf: "center" }}>
                +{route.steps.length - 4} más
              </span>
            )}
          </div>
        )}

        <div className="d-flex gap-3 mb-3" style={{ color: "rgba(255,255,255,0.35)", fontSize: "0.75rem" }}>
          {route.steps?.length > 0 && (
            <span>🗂️ {route.steps.length} parada{route.steps.length !== 1 ? "s" : ""}</span>
          )}
          {photos.length > 0 && (
            <span>📷 {photos.length} foto{photos.length !== 1 ? "s" : ""}</span>
          )}
        </div>

        {/* BOTONES */}
        <div className="d-flex gap-2 mt-auto">
          <button
            onClick={onView}
            className="btn btn-sm fw-bold rounded-pill flex-grow-1"
            style={{
              background: "linear-gradient(135deg, #f9d423 0%, #ff4e50 100%)",
              border: "none", color: "#000", fontSize: "0.8rem"
            }}
          >
            🗺️ Ver detalle
          </button>

          <button
            onClick={onEdit}
            className="btn btn-sm rounded-circle d-flex align-items-center justify-content-center"
            style={{
              background: "rgba(249,212,35,0.1)", color: "#f9d423",
              border: "1px solid rgba(249,212,35,0.35)",
              width: "34px", height: "34px", flexShrink: 0
            }}
            title="Editar ruta"
          >
            ✏️
          </button>

          <button
            onClick={onDelete}
            className="btn btn-sm rounded-circle d-flex align-items-center justify-content-center"
            style={{
              background: "rgba(220,53,69,0.15)", color: "#ff6b7a",
              border: "1px solid rgba(220,53,69,0.4)",
              width: "34px", height: "34px", flexShrink: 0
            }}
            title="Eliminar ruta"
          >
            🗑️
          </button>
        </div>
      </div>
    </div>
  );
};

// -----------------------------------------------------------------------------
// Página MyRoutes
// -----------------------------------------------------------------------------
const MyRoutes = () => {
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    let mounted = true;
    const fetchMyRoutes = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API_BASE}/api/my-routes`, {
          headers: { ...authHeaders() }
        });
        if (res.status === 401) {
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          navigate("/login");
          return;
        }
        const data = await res.json();

        const rawRoutes = Array.isArray(data) ? data : (data.routes || data.items || []);
        const normalizedRoutes = rawRoutes.map(r => {
          const clone = { ...r };
          clone.steps = Array.isArray(clone.steps) ? clone.steps : (clone.paradas || clone.stops || []);
          clone.images = clone.images || clone.photos || clone.photos_urls || [];
          return clone;
        });

        if (mounted) setRoutes(normalizedRoutes);
      } catch (err) {
        console.error("Error cargando rutas:", err);
        if (mounted) setRoutes([]);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    fetchMyRoutes();
    return () => { mounted = false; };
  }, [navigate]);

  const handleDelete = async (routeId) => {
    if (!window.confirm("¿Eliminar esta ruta? Esta acción no se puede deshacer.")) return;
    try {
      const res = await fetch(`${API_BASE}/api/routes/${routeId}`, {
        method: "DELETE",
        headers: { ...authHeaders() }
      });
      if (res.ok) setRoutes(prev => prev.filter(r => r.id !== routeId));
    } catch (err) {
      console.error("Error al eliminar:", err);
    }
  };

  if (loading) return (
    <div className="d-flex flex-column align-items-center justify-content-center" style={{ minHeight: "60vh", background: "#0d1117" }}>
      <div className="spinner-border mb-3" style={{ color: "#00f2fe", width: "3rem", height: "3rem" }}></div>
      <p style={{ color: "#00f2fe", letterSpacing: "3px", fontSize: "0.8rem", textTransform: "uppercase" }}>
        Cargando tus rutas...
      </p>
    </div>
  );

  return (
    <div style={{ background: "#0d1117", minHeight: "100vh" }}>
      {/* HEADER */}
      <div className="text-center text-white" style={{
        background: "linear-gradient(135deg, #0f2027 0%, #203a43 50%, #2c5364 100%)",
        padding: "50px 20px 40px", position: "relative"
      }}>
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "4px", background: "linear-gradient(to right, #00f2fe, #4facfe, #f9d423)" }} />
        <p style={{ color: "#f9d423", letterSpacing: "3px", fontSize: "0.7rem", textTransform: "uppercase", marginBottom: "8px" }}>
          Tu espacio viajero
        </p>
        <h1 className="fw-black mb-2" style={{ fontSize: "2.5rem", letterSpacing: "-1px" }}>
          Mis{" "}
          <span style={{ background: "linear-gradient(135deg, #f9d423 0%, #ff4e50 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            Rutas
          </span>
        </h1>
        <p style={{ color: "rgba(255,255,255,0.6)", fontSize: "0.95rem", marginBottom: "24px" }}>
          Gestiona y comparte tus aventuras con la comunidad
        </p>
        <button
          onClick={() => navigate("/create-route")}
          className="btn fw-bold rounded-pill shadow-lg"
          style={{
            background: "linear-gradient(135deg, #f9d423 0%, #ff4e50 100%)",
            border: "none", color: "#000", padding: "10px 30px",
            fontSize: "0.9rem", letterSpacing: "1px",
            boxShadow: "0 0 20px rgba(249, 212, 35, 0.3)", transition: "all 0.3s ease"
          }}
        >
          + Nueva Ruta
        </button>
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "1px", background: "linear-gradient(to right, transparent, #00f2fe, transparent)" }} />
      </div>

      {/* CONTENIDO */}
      <div className="container py-5" style={{ maxWidth: "1200px" }}>
        <div className="d-flex align-items-center mb-4">
          <div style={{ height: "2px", flex: 1, background: "linear-gradient(to right, transparent, rgba(0,242,254,0.3))" }} />
          <span className="mx-3 fw-bold text-uppercase" style={{ color: "rgba(255,255,255,0.4)", letterSpacing: "3px", fontSize: "0.75rem" }}>
            Todas mis rutas
          </span>
          <div style={{ height: "2px", flex: 1, background: "linear-gradient(to left, transparent, rgba(0,242,254,0.3))" }} />
        </div>

        {routes.length === 0 ? (
          <div className="text-center py-5">
            <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "1.1rem" }}>Aún no has creado ninguna ruta.</p>
            <button
              onClick={() => navigate("/create-route")}
              className="btn fw-bold rounded-pill mt-3"
              style={{
                background: "linear-gradient(135deg, #f9d423 0%, #ff4e50 100%)",
                border: "none", color: "#000", padding: "10px 30px",
                boxShadow: "0 0 20px rgba(249, 212, 35, 0.3)"
              }}
            >
              ¡Crea tu primera ruta!
            </button>
          </div>
        ) : (
          <div className="row row-cols-1 row-cols-md-2 row-cols-lg-3 g-4">
            {routes.map((route) => (
              <div className="col" key={route.id}>
                <RouteCard
                  route={route}
                  onView={() => navigate(`/route/${route.id}`)}
                  onEdit={() => navigate(`/edit-route/${route.id}`)}
                  onDelete={() => handleDelete(route.id)}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      <style>{`body { background: #0d1117 !important; }`}</style>
    </div>
  );
};

export default MyRoutes;