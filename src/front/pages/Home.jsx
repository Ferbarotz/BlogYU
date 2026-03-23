// src/front/pages/Home.jsx
import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import PostCard from "../components/PostCard";
import RouteCard from "../components/RouteCard";
import { API_BASE } from "../api/backend";

const CATEGORIES = [
  { id: "todos", name: "🌍 Todos" },
  { id: "hoteles", name: "🏨 Hoteles" },
  { id: "restaurantes", name: "🍽️ Restaurantes" },
  { id: "bares", name: "🍹 Bares" },
  { id: "lugares", name: "📍 Lugares" },
  { id: "cultura", name: "🎭 Cultura" },
];

const Home = () => {
  const [feed, setFeed] = useState([]);
  const [filteredFeed, setFilteredFeed] = useState([]);
  const [activeCategory, setActiveCategory] = useState("todos");
  const [loading, setLoading] = useState(true);

  const navigate = useNavigate();
  const location = useLocation();

  const token = localStorage.getItem("token");
  const user = JSON.parse(localStorage.getItem("user") || "null");

  const normalizeUrl = (url) => {
    if (!url) return null;
    try {
      if (url.startsWith("/")) return `${API_BASE.replace(/\/$/, "")}${url}`;
      const parsed = new URL(url);
      if (parsed.hostname === "127.0.0.1" || parsed.hostname === "localhost") {
        const path = `${parsed.pathname}${parsed.search || ""}${parsed.hash || ""}`;
        return `${API_BASE.replace(/\/$/, "")}${path}`;
      }
      return url;
    } catch (err) {
      return url;
    }
  };

  const fixImageUrl = (url) => {
    if (!url) return "https://images.unsplash.com/photo-1499750310107-5fef28a66643?w=500";
    if (typeof url === "string" && url.startsWith("/")) return `${API_BASE.replace(/\/$/, "")}${url}`;
    try {
      const parsed = new URL(url);
      if (parsed.hostname === "127.0.0.1" || parsed.hostname === "localhost") return normalizeUrl(url);
    } catch (e) {}
    return url;
  };

  // ── FETCH COMBINADO ──
  useEffect(() => {
    Promise.all([
      fetch(`${API_BASE}/api/posts`).then(r => r.json()),
      fetch(`${API_BASE}/api/routes`).then(r => r.json())
    ]).then(([postsData, routesData]) => {
      const combined = [
        ...(Array.isArray(postsData) ? postsData : []).map(p => ({ ...p, type: "post" })),
        ...(Array.isArray(routesData) ? routesData : []).map(r => ({ ...r, type: "route" }))
      ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      setFeed(combined);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  // ── CATEGORÍA DESDE URL ──
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const categoryParam = params.get("category");
    setActiveCategory(categoryParam ? categoryParam.toLowerCase() : "todos");
  }, [location.search]);

  // ── FILTRO POR CATEGORÍA (solo aplica a posts) ──
  useEffect(() => {
    if (activeCategory === "todos") {
      setFilteredFeed(feed);
    } else {
      setFilteredFeed(feed.filter(item => {
        if (item.type === "route") return false; // rutas no tienen categoría
        const cat = item.category ? item.category.toString().toLowerCase() : "";
        return cat === activeCategory;
      }));
    }
  }, [activeCategory, feed]);

  if (loading) return (
    <div className="d-flex flex-column align-items-center justify-content-center" style={{ minHeight: "60vh", background: "#0d1117" }}>
      <div className="spinner-border mb-3" style={{ color: "#00f2fe", width: "3rem", height: "3rem" }}></div>
      <p style={{ color: "#00f2fe", letterSpacing: "3px", fontSize: "0.8rem", textTransform: "uppercase" }}>
        Cargando destinos...
      </p>
    </div>
  );

  const heroBackground = token && user?.background
    ? `linear-gradient(rgba(0,0,0,0.55), rgba(0,0,0,0.55)), url(${normalizeUrl(user.background)})`
    : "linear-gradient(135deg, #0f2027 0%, #203a43 50%, #2c5364 100%)";

  return (
    <div style={{ background: "#0d1117", minHeight: "100vh" }}>

      {/* ── HERO ── */}
      <div
        className="text-center text-white"
        style={{
          backgroundImage: heroBackground,
          backgroundSize: "cover",
          backgroundPosition: "center",
          minHeight: "380px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          padding: "40px 20px",
          position: "relative",
          transition: "all 0.5s ease",
        }}
      >
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "4px", background: "linear-gradient(to right, #00f2fe, #4facfe, #f9d423)" }} />

        {token && user ? (
          <>
            <p style={{ color: "#00f2fe", letterSpacing: "3px", fontSize: "0.7rem", textTransform: "uppercase", marginBottom: "8px" }}>
              Bienvenido de vuelta
            </p>
            <h1 className="fw-black" style={{ fontSize: "2.5rem", letterSpacing: "-1px" }}>
              ¡Hola, {user.name}! 👋
            </h1>
            <p className="mb-4" style={{ color: "rgba(255,255,255,0.7)", maxWidth: "450px", fontSize: "1rem" }}>
              Qué bueno verte de nuevo. ¿Qué hacemos hoy?
            </p>
            <div className="d-flex gap-3 flex-wrap justify-content-center mt-2">
              <button
                onClick={() => navigate("/new-post")}
                className="btn fw-bold rounded-pill shadow-lg"
                style={{ background: "linear-gradient(135deg, #00f2fe 0%, #4facfe 100%)", border: "none", color: "#000", letterSpacing: "1px", padding: "10px 30px", fontSize: "0.9rem", boxShadow: "0 0 20px rgba(0,242,254,0.3)", transition: "all 0.3s ease" }}
                onMouseOver={(e) => e.currentTarget.style.transform = "scale(1.05)"}
                onMouseOut={(e) => e.currentTarget.style.transform = "scale(1)"}
              >✍️ Crear publicación</button>
              <button
                onClick={() => navigate("/create-route")}
                className="btn fw-bold rounded-pill shadow-lg"
                style={{ background: "linear-gradient(135deg, #f9d423 0%, #ff4e50 100%)", border: "none", color: "#000", letterSpacing: "1px", padding: "10px 30px", fontSize: "0.9rem", boxShadow: "0 0 20px rgba(249,212,35,0.3)", transition: "all 0.3s ease" }}
                onMouseOver={(e) => e.currentTarget.style.transform = "scale(1.05)"}
                onMouseOut={(e) => e.currentTarget.style.transform = "scale(1)"}
              >🗺️ Crear ruta</button>
            </div>
          </>
        ) : (
          <>
            <p style={{ color: "#f9d423", letterSpacing: "3px", fontSize: "0.7rem", textTransform: "uppercase", marginBottom: "8px" }}>
              Comunidad Viajera
            </p>
            <h1 className="fw-black" style={{ fontSize: "2.8rem", letterSpacing: "-1.5px" }}>
              Explora{" "}
              <span style={{ background: "linear-gradient(135deg, #00f2fe 0%, #4facfe 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                BlogYU
              </span>
            </h1>
            <p className="mb-4" style={{ color: "rgba(255,255,255,0.65)", maxWidth: "450px", fontSize: "0.95rem" }}>
              Encuentra los mejores sitios recomendados por la comunidad viajera.
            </p>
            <button
              onClick={() => navigate("/register")}
              className="btn fw-bold rounded-pill shadow-lg mt-2"
              style={{ background: "linear-gradient(135deg, #f9d423 0%, #ff4e50 100%)", border: "none", color: "#000", letterSpacing: "1px", padding: "10px 30px", fontSize: "0.9rem", boxShadow: "0 0 20px rgba(249,212,35,0.3)", transition: "all 0.3s ease" }}
              onMouseOver={(e) => e.currentTarget.style.transform = "scale(1.05)"}
              onMouseOut={(e) => e.currentTarget.style.transform = "scale(1)"}
            >¡Únete a la comunidad!</button>
          </>
        )}

        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "1px", background: "linear-gradient(to right, transparent, #00f2fe, transparent)" }} />
      </div>

      {/* ── CONTENIDO PRINCIPAL ── */}
      <div className="container py-5" style={{ maxWidth: "1200px" }}>

        {/* BARRA DE CATEGORÍAS */}
        <div className="d-flex justify-content-center flex-wrap gap-2 mb-5">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => cat.id === "todos" ? navigate("/") : navigate(`/?category=${cat.id}`)}
              className="btn rounded-pill px-4 fw-bold"
              style={
                activeCategory === cat.id
                  ? { background: "linear-gradient(135deg, #00f2fe 0%, #4facfe 100%)", border: "none", color: "#000", boxShadow: "0 0 15px rgba(0,242,254,0.4)" }
                  : { background: "transparent", border: "1px solid rgba(255,255,255,0.2)", color: "rgba(255,255,255,0.7)" }
              }
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* TÍTULO DE SECCIÓN */}
        <div className="d-flex align-items-center mb-4">
          <div style={{ height: "2px", flex: 1, background: "linear-gradient(to right, transparent, rgba(0,242,254,0.3))" }} />
          <span className="mx-3 fw-bold text-uppercase" style={{ color: "rgba(255,255,255,0.4)", letterSpacing: "3px", fontSize: "0.75rem" }}>
            {activeCategory === "todos" ? "Todos los destinos" : `Destinos · ${activeCategory}`}
          </span>
          <div style={{ height: "2px", flex: 1, background: "linear-gradient(to left, transparent, rgba(0,242,254,0.3))" }} />
        </div>

        {/* ── FEED COMBINADO ── */}
        <div className="row row-cols-1 row-cols-md-2 row-cols-lg-4 g-4">
          {filteredFeed.length === 0 ? (
            <div className="col-12 text-center py-5">
              <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "1.1rem" }}>
                No hay publicaciones en "{activeCategory}" todavía.
              </p>
            </div>
          ) : (
            filteredFeed.map((item) => (
              <div className="col" key={`${item.type}-${item.id}`}>
                {item.type === "post" ? (
                  <PostCard
                    post={item}
                    onView={() => navigate(`/posts/${item.id}`)}
                  />
                ) : (
                  <RouteCard
                    route={item}
                    onView={() => navigate(`/route/${item.id}`)}
                  />
                )}
              </div>
            ))
          )}
        </div>
      </div>

      <style>{`body { background: #0d1117 !important; }`}</style>
    </div>
  );
};

export default Home;
