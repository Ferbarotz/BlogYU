import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { API_BASE, authHeaders } from "../api/backend";
import PostCard from "../components/PostCard";

const MyPosts = () => {
  const navigate = useNavigate();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });

  const normalizePostImages = (p) => {
    const clone = { ...p };
    if (!clone.images) {
      if (clone.photos && Array.isArray(clone.photos)) clone.images = clone.photos;
      else if (clone.image && Array.isArray(clone.image)) clone.images = clone.image;
      else if (clone.image && typeof clone.image === "string") clone.images = [clone.image];
      else clone.images = [];
    }
    clone.images = clone.images
      .map((img) => {
        if (!img) return null;
        const raw = typeof img === "object" ? img.url || img.path || img : img;
        if (typeof raw === "string" && raw.startsWith("/")) return `${API_BASE}${raw}`;
        return raw;
      })
      .filter(Boolean);
    if (!clone.image && clone.images.length > 0) clone.image = clone.images[0];
    return clone;
  };

  const fetchMyPosts = async ({ page = 1, status = "all", append = false } = {}) => {
    try {
      if (append) setLoadingMore(true);
      else setLoading(true);

      const params = new URLSearchParams({ page: String(page), per_page: "8" });
      if (status === "draft" || status === "published") params.set("status", status);

      const res = await fetch(`${API_BASE}/api/my-posts?${params.toString()}`, { headers: authHeaders() });
      if (res.status === 401) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        navigate("/login");
        return;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json();
      const list = (Array.isArray(data) ? data : data.items || data.posts || []).map(normalizePostImages);

      setPosts((prev) => (append ? [...prev, ...list] : list));
      setPagination({
        page: data.page || page,
        pages: data.pages || 1,
        total: data.total || list.length,
      });
    } catch (err) {
      console.error("Error cargando mis posts:", err);
      if (!append) setPosts([]);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    fetchMyPosts({ page: 1, status: statusFilter, append: false });
  }, [statusFilter]);

  const handleDelete = async (postId) => {
    if (!window.confirm("¿Eliminar esta publicación? Esta acción no se puede deshacer.")) return;
    try {
      const res = await fetch(`${API_BASE}/api/posts/${postId}`, {
        method: "DELETE",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
      });
      if (res.ok) {
        setPosts((prev) => prev.filter((p) => String(p.id) !== String(postId)));
        setPagination((prev) => ({ ...prev, total: Math.max(0, prev.total - 1) }));
      }
    } catch (err) {
      console.error("Error al eliminar:", err);
    }
  };

  if (loading) return (
    <div className="d-flex flex-column align-items-center justify-content-center" style={{ minHeight: "60vh", background: "#0d1117" }}>
      <div className="spinner-border mb-3" style={{ color: "#00f2fe", width: "3rem", height: "3rem" }}></div>
      <p style={{ color: "#00f2fe", letterSpacing: "3px", fontSize: "0.8rem", textTransform: "uppercase" }}>Cargando tus publicaciones...</p>
    </div>
  );

  return (
    <div style={{ background: "#0d1117", minHeight: "100vh" }}>
      <div className="text-center text-white" style={{ background: "linear-gradient(135deg, #0f2027 0%, #203a43 50%, #2c5364 100%)", padding: "50px 20px 40px", position: "relative" }}>
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "4px", background: "linear-gradient(to right, #00f2fe, #4facfe, #f9d423)" }} />
        <p style={{ color: "#f9d423", letterSpacing: "3px", fontSize: "0.7rem", textTransform: "uppercase", marginBottom: "8px" }}>Tu espacio viajero</p>
        <h1 className="fw-black mb-2" style={{ fontSize: "2.5rem", letterSpacing: "-1px" }}>
          Mis <span style={{ background: "linear-gradient(135deg, #00f2fe 0%, #4facfe 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Publicaciones</span>
        </h1>
        <div className="d-flex gap-2 justify-content-center flex-wrap">
          {[
            { key: "all", label: "Todas" },
            { key: "published", label: "Publicadas" },
            { key: "draft", label: "Borradores" },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setStatusFilter(tab.key)}
              className="btn btn-sm"
              style={{
                background: statusFilter === tab.key ? "linear-gradient(135deg,#00f2fe,#4facfe)" : "rgba(255,255,255,0.05)",
                color: statusFilter === tab.key ? "#000" : "#fff",
                border: "1px solid rgba(255,255,255,0.15)",
                borderRadius: "999px",
                fontWeight: 700,
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="container py-5" style={{ maxWidth: "1200px" }}>
        <div className="d-flex justify-content-between align-items-center mb-3">
          <span style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.9rem" }}>Total: {pagination.total}</span>
          <button
            onClick={() => navigate("/new-post")}
            className="btn fw-bold rounded-pill"
            style={{ background: "linear-gradient(135deg, #00f2fe 0%, #4facfe 100%)", border: "none", color: "#000" }}
          >
            + Nueva publicación
          </button>
        </div>

        {posts.length === 0 ? (
          <div className="text-center py-5">
            <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "1.1rem" }}>No hay publicaciones en este filtro.</p>
          </div>
        ) : (
          <>
            <div className="row row-cols-1 row-cols-md-2 row-cols-lg-3 g-4">
              {posts.map((post) => (
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

            <div className="text-center py-4">
              {pagination.page < pagination.pages ? (
                <button
                  onClick={() => fetchMyPosts({ page: pagination.page + 1, status: statusFilter, append: true })}
                  className="btn"
                  disabled={loadingMore}
                  style={{ borderColor: "#00f2fe", color: "#00f2fe", border: "1px solid #00f2fe" }}
                >
                  {loadingMore ? "Cargando..." : "Cargar más"}
                </button>
              ) : (
                <span style={{ color: "rgba(255,255,255,0.45)", fontSize: "0.9rem" }}>No hay más publicaciones.</span>
              )}
            </div>
          </>
        )}
      </div>

      <style>{`body { background: #0d1117 !important; }`}</style>
    </div>
  );
};

export default MyPosts;
