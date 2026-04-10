// src/front/pages/MyPosts.jsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { API_BASE, authHeaders } from "../api/backend";
import PostCard from "../components/PostCard";

const DEFAULT_CATEGORIES = [
  { id: "todos", name: "🌍 Todos" },
  { id: "hoteles", name: "🏨 Hoteles" },
  { id: "restaurantes", name: "🍽️ Restaurantes" },
  { id: "bares", name: "🍹 Bares" },
  { id: "lugares", name: "📍 Lugares" },
  { id: "cultura", name: "🎭 Cultura" },
  { id: "otros", name: "✨ Otros" }
];

const normalizeCategory = (cat) => {
  if (!cat) return "";
  if (typeof cat === "string") return cat.trim().toLowerCase();
  if (typeof cat === "object" && cat !== null) return (cat.id || cat.name || "").toString().trim().toLowerCase();
  return "";
};

const fixImage = (img) => {
  if (!img) return null;
  if (typeof img === "string" && img.startsWith("/")) return `${API_BASE}${img}`;
  return img;
};

// ── PÁGINA PRINCIPAL ──
const MyPosts = () => {
  const navigate = useNavigate();
  const [posts, setPosts] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);
  const [activeCategory, setActiveCategory] = useState("todos");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const fetchCategories = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/categories`);
        if (!res.ok) throw new Error("no categories endpoint");
        const data = await res.json();
        if (!mounted) return;
        if (Array.isArray(data) && data.length) {
          const normalized = [{ id: "todos", name: "🌍 Todos" }].concat(
            data.map(c => (typeof c === "string" ? { id: c, name: c } : { id: c.id ?? c.name, name: c.name ?? c.id }))
          );
          setCategories(normalized);
        }
      } catch (e) {
        console.warn("Usando categorías por defecto.");
      }
    };
    fetchCategories();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    let mounted = true;
    const fetchMyPosts = async () => {
      setLoading(true);

      // función de normalización mínima para imágenes y location (no cambia nada más)
      const normalizePostImages = (p) => {
        const clone = { ...p };
        // Establece images (array) si vienen en distintos formatos
        if (!clone.images) {
          if (clone.photos && Array.isArray(clone.photos)) clone.images = clone.photos;
          else if (clone.image && Array.isArray(clone.image)) clone.images = clone.image;
          else if (clone.image && typeof clone.image === "string") clone.images = [clone.image];
          else clone.images = [];
        }
        // Normaliza cada URL absoluta
        clone.images = clone.images.map((img) => {
          if (!img) return null;
          const raw = (typeof img === "object") ? (img.url || img.path || img) : img;
          if (typeof raw === "string" && raw.startsWith("/")) return `${API_BASE}${raw}`;
          return raw;
        }).filter(Boolean);

        // También asegúrate de tener clone.image (string) como fallback
        if (!clone.image && clone.images.length > 0) clone.image = clone.images[0];

        // location unificado (si añadiste el campo en backend)
        clone.location = clone.location || clone.place || null;

        return clone;
      };

      try {
        const headers = { ...authHeaders() };
        const res = await fetch(`${API_BASE}/api/my-posts`, { headers });
        if (res.status === 401) {
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          navigate("/login");
          return;
        }
        if (!res.ok) {
          const alt = await fetch(`${API_BASE}/api/posts?mine=true`, { headers });
          if (!alt.ok) throw new Error("No se pudo cargar posts");
          const altData = await alt.json();
          if (!mounted) return;
          const postsArray = Array.isArray(altData) ? altData : altData.posts || [];
          const normalized = postsArray.map(normalizePostImages);
          setPosts(normalized);
        } else {
          const data = await res.json();
          if (!mounted) return;
          const postsArray = Array.isArray(data) ? data : data.posts || [];
          const normalized = postsArray.map(normalizePostImages);
          setPosts(normalized);
        }
      } catch (err) {
        console.error("Error cargando mis posts:", err);
        if (mounted) setPosts([]);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    fetchMyPosts();
    return () => { mounted = false; };
  }, [navigate]);

  useEffect(() => {
    if (activeCategory === "todos") setFiltered(posts);
    else setFiltered(posts.filter(p => normalizeCategory(p.category) === activeCategory.toLowerCase()));
  }, [activeCategory, posts]);

  const handleDelete = async (postId) => {
    if (!window.confirm("¿Eliminar esta publicación? Esta acción no se puede deshacer.")) return;
    try {
      const res = await fetch(`${API_BASE}/api/posts/${postId}`, {
        method: "DELETE",
        headers: { ...authHeaders(), "Content-Type": "application/json" }
      });
      if (res.ok) setPosts(prev => prev.filter(p => String(p.id) !== String(postId)));
    } catch (err) {
      console.error("Error al eliminar:", err);
    }
  };

  if (loading) return (
    <div className="d-flex flex-column align-items-center justify-content-center" style={{ minHeight: "60vh", background: "#0d1117" }}>
      <div className="spinner-border mb-3" style={{ color: "#00f2fe", width: "3rem", height: "3rem" }}></div>
      <p style={{ color: "#00f2fe", letterSpacing: "3px", fontSize: "0.8rem", textTransform: "uppercase" }}>
        Cargando tus publicaciones...
      </p>
    </div>
  );

  return (
    <div style={{ background: "#0d1117", minHeight: "100vh" }}>

      {/* ── HEADER ── */}
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
          <span style={{ background: "linear-gradient(135deg, #00f2fe 0%, #4facfe 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            Publicaciones
          </span>
        </h1>
        <p style={{ color: "rgba(255,255,255,0.6)", fontSize: "0.95rem", marginBottom: "24px" }}>
          Gestiona y comparte tus experiencias con la comunidad
        </p>
        <button
          onClick={() => navigate("/new-post")}
          className="btn fw-bold rounded-pill shadow-lg"
          style={{
            background: "linear-gradient(135deg, #00f2fe 0%, #4facfe 100%)",
            border: "none", color: "#000", padding: "10px 30px",
            fontSize: "0.9rem", letterSpacing: "1px",
            boxShadow: "0 0 20px rgba(0, 242, 254, 0.3)", transition: "all 0.3s ease"
          }}
          onMouseOver={(e) => e.currentTarget.style.transform = "scale(1.05)"}
          onMouseOut={(e) => e.currentTarget.style.transform = "scale(1)"}
        >
          + Nueva Publicación
        </button>
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "1px", background: "linear-gradient(to right, transparent, #00f2fe, transparent)" }} />
      </div>

      {/* ── CONTENIDO ── */}
      <div className="container py-5" style={{ maxWidth: "1200px" }}>

        {/* CATEGORÍAS */}
        <div className="d-flex justify-content-center flex-wrap gap-2 mb-5">
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className="btn rounded-pill px-4 fw-bold"
              style={
                activeCategory === cat.id
                  ? { background: "linear-gradient(135deg, #00f2fe 0%, #4facfe 100%)", border: "none", color: "#000", boxShadow: "0 0 15px rgba(0, 242, 254, 0.4)" }
                  : { background: "transparent", border: "1px solid rgba(255,255,255,0.2)", color: "rgba(255,255,255,0.7)" }
              }
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* TÍTULO SECCIÓN */}
        <div className="d-flex align-items-center mb-4">
          <div style={{ height: "2px", flex: 1, background: "linear-gradient(to right, transparent, rgba(0,242,254,0.3))" }} />
          <span className="mx-3 fw-bold text-uppercase" style={{ color: "rgba(255,255,255,0.4)", letterSpacing: "3px", fontSize: "0.75rem" }}>
            {activeCategory === "todos" ? "Todas mis publicaciones" : `Mis posts · ${activeCategory}`}
          </span>
          <div style={{ height: "2px", flex: 1, background: "linear-gradient(to left, transparent, rgba(0,242,254,0.3))" }} />
        </div>

        {/* LISTADO */}
        {filtered.length === 0 ? (
          <div className="text-center py-5">
            <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "1.1rem" }}>
              No tienes publicaciones en "{activeCategory}" todavía.
            </p>
            <button
              onClick={() => navigate("/new-post")}
              className="btn fw-bold rounded-pill mt-3"
              style={{
                background: "linear-gradient(135deg, #00f2fe 0%, #4facfe 100%)",
                border: "none", color: "#000", padding: "10px 30px",
                boxShadow: "0 0 20px rgba(0, 242, 254, 0.3)"
              }}
            >
              ¡Crea tu primera publicación!
            </button>
          </div>
        ) : (
          <div className="row row-cols-1 row-cols-md-2 row-cols-lg-3 g-4">
            {filtered.map(post => (
              <div className="col" key={post.id}>
                <PostCard
                  post={post}
                  onView={() => navigate(`/posts/${post.id}`)}
                  onEdit={() => navigate(`/edit-post/${post.id}`)}
                  onDelete={() => handleDelete(post.id)}
                  showAuthor={false}
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

export default MyPosts;