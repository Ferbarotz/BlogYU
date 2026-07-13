// src/front/pages/MyRoutes.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_BASE, authHeaders } from '../api/backend';
import RouteCard from '../components/RouteCard';


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
      <div className="spinner-border mb-3" style={{ color: "#f9d423", width: "3rem", height: "3rem" }}></div>
      <p style={{ color: "#f9d423", letterSpacing: "3px", fontSize: "0.8rem", textTransform: "uppercase" }}>
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
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "1px", background: "linear-gradient(to right, transparent, #f9d423, transparent)" }} />
      </div>

      {/* CONTENIDO */}
      <div className="container py-5" style={{ maxWidth: "1200px" }}>
        <div className="d-flex align-items-center mb-4">
          <div style={{ height: "2px", flex: 1, background: "linear-gradient(to right, transparent, rgba(249,212,35,0.3))" }} />
          <span className="mx-3 fw-bold text-uppercase" style={{ color: "rgba(255,255,255,0.4)", letterSpacing: "3px", fontSize: "0.75rem" }}>
            {routes.length > 0 ? `${routes.length} Ruta${routes.length !== 1 ? "s" : ""}` : "Mis Rutas"}
          </span>
          <div style={{ height: "2px", flex: 1, background: "linear-gradient(to left, transparent, rgba(249,212,35,0.3))" }} />
        </div>

        {routes.length === 0 ? (
          <div className="text-center py-5">
            <div style={{ fontSize: "4rem", marginBottom: "1.5rem", opacity: 0.7 }}>🗺️</div>
            <h3 style={{ color: "#f9d423", fontWeight: "bold", marginBottom: "0.5rem" }}>
              ¡Empieza tu aventura!
            </h3>
            <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "1rem", marginBottom: "2rem" }}>
              Aún no has creado ninguna ruta. Comparte tus viajes con la comunidad.
            </p>
            <button
              onClick={() => navigate("/create-route")}
              className="btn fw-bold rounded-pill"
              style={{
                background: "linear-gradient(135deg, #f9d423 0%, #ff4e50 100%)",
                border: "none", 
                color: "#000", 
                padding: "12px 36px",
                fontSize: "1rem",
                boxShadow: "0 8px 24px rgba(249, 212, 35, 0.3)",
                transition: "transform 0.2s ease"
              }}
              onMouseOver={(e) => e.currentTarget.style.transform = "translateY(-2px)"}
              onMouseOut={(e) => e.currentTarget.style.transform = "translateY(0)"}
            >
              🚀 Crear mi primera ruta
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