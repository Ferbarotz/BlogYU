// src/front/pages/Posts.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import PostCard from "../components/PostCard";
import { API_BASE } from "../api/backend";

const Posts = () => {
  const navigate = useNavigate();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [query, setQuery] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0, per_page: 10 });

  const fetchPosts = async ({ page = 1, q = "", append = false } = {}) => {
    const params = new URLSearchParams({ page: String(page), per_page: "8" });
    if (q.trim()) params.set("q", q.trim());

    try {
      if (append) setLoadingMore(true);
      else setLoading(true);

      const res = await fetch(`${API_BASE}/api/posts?${params.toString()}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const items = Array.isArray(data) ? data : (data.items || data.posts || []);

      setPosts((prev) => (append ? [...prev, ...items] : items));
      setPagination({
        page: data.page || page,
        pages: data.pages || 1,
        total: data.total || items.length,
        per_page: data.per_page || 8,
      });
    } catch (error) {
      console.error("Error cargando posts:", error);
      if (!append) setPosts([]);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    fetchPosts({ page: 1, q: query, append: false });
  }, [query]);

  const onSearch = (e) => {
    e.preventDefault();
    setQuery(searchInput.trim());
  };

  const canLoadMore = pagination.page < pagination.pages;

  if (loading) {
    return (
      <div className="d-flex flex-column align-items-center justify-content-center" style={{ minHeight: "60vh", background: "#0d1117" }}>
        <div className="spinner-border mb-3" style={{ color: "#00f2fe", width: "3rem", height: "3rem" }}></div>
        <p style={{ color: "#00f2fe", letterSpacing: "3px", fontSize: "0.8rem", textTransform: "uppercase" }}>
          Cargando publicaciones...
        </p>
      </div>
    );
  }

  return (
    <div style={{ background: "#0d1117", minHeight: "100vh" }}>
      <div className="container py-5" style={{ maxWidth: "1200px" }}>
        <div className="text-center mb-4">
          <p style={{ color: "#00f2fe", letterSpacing: "3px", fontSize: "0.7rem", textTransform: "uppercase", marginBottom: "8px" }}>
            Comunidad Viajera
          </p>
          <h1 className="fw-black" style={{ color: "#fff", fontSize: "2.4rem", letterSpacing: "-1px" }}>
            Últimas <span style={{ background: "linear-gradient(135deg, #00f2fe 0%, #4facfe 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Publicaciones</span>
          </h1>
        </div>

        <form onSubmit={onSearch} className="d-flex gap-2 mb-4" style={{ maxWidth: 760, margin: "0 auto" }}>
          <input
            type="text"
            className="form-control"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Buscar por título, contenido o categoría..."
            style={{ background: "rgba(255,255,255,0.05)", color: "#fff", border: "1px solid rgba(255,255,255,0.14)" }}
          />
          <button className="btn fw-bold" style={{ background: "linear-gradient(135deg,#00f2fe,#4facfe)", color: "#000", border: "none" }}>
            Buscar
          </button>
          {query && (
            <button
              type="button"
              className="btn btn-outline-light"
              onClick={() => {
                setSearchInput("");
                setQuery("");
              }}
            >
              Limpiar
            </button>
          )}
        </form>

        <div className="d-flex align-items-center mb-4">
          <div style={{ height: "2px", flex: 1, background: "linear-gradient(to right, transparent, rgba(0,242,254,0.3))" }} />
          <span className="mx-3 fw-bold text-uppercase" style={{ color: "rgba(255,255,255,0.4)", letterSpacing: "3px", fontSize: "0.75rem" }}>
            {pagination.total} resultado{pagination.total !== 1 ? "s" : ""}
          </span>
          <div style={{ height: "2px", flex: 1, background: "linear-gradient(to left, transparent, rgba(0,242,254,0.3))" }} />
        </div>

        {posts.length === 0 ? (
          <div className="text-center py-5">
            <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "1.1rem" }}>No hay publicaciones para tu búsqueda.</p>
          </div>
        ) : (
          <>
            <div className="row row-cols-1 row-cols-md-2 row-cols-lg-4 g-4">
              {posts.map((post) => (
                <div className="col" key={post.id}>
                  <PostCard post={post} onView={() => navigate(`/posts/${post.id}`)} />
                </div>
              ))}
            </div>

            <div className="text-center py-4">
              {canLoadMore ? (
                <button
                  onClick={() => fetchPosts({ page: pagination.page + 1, q: query, append: true })}
                  className="btn"
                  disabled={loadingMore}
                  style={{ borderColor: "#00f2fe", color: "#00f2fe", border: "1px solid #00f2fe" }}
                >
                  {loadingMore ? "Cargando..." : "Cargar más"}
                </button>
              ) : (
                <span style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.9rem" }}>No hay más resultados.</span>
              )}
            </div>
          </>
        )}
      </div>

      <style>{`body { background: #0d1117 !important; }`}</style>
    </div>
  );
};

export default Posts;
