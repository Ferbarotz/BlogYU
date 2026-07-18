// src/front/pages/Posts.jsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import PostCard from "../components/PostCard";
import { API_BASE } from "../api/backend";

const Posts = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/posts`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        setPosts(Array.isArray(data) ? data : data.posts || []);
      } catch (error) {
        console.error("Error cargando posts:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchPosts();
  }, []);

  if (loading) {
    return (
      <div
        className="d-flex flex-column align-items-center justify-content-center"
        style={{ minHeight: "60vh", background: "#0d1117" }}
      >
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
        {/* Encabezado con identidad de "publicaciones" (azul) */}
        <div className="text-center mb-4">
          <p
            style={{
              color: "#00f2fe",
              letterSpacing: "3px",
              fontSize: "0.7rem",
              textTransform: "uppercase",
              marginBottom: "8px",
            }}
          >
            Comunidad Viajera
          </p>
          <h1 className="fw-black" style={{ color: "#fff", fontSize: "2.4rem", letterSpacing: "-1px" }}>
            Últimas{" "}
            <span
              style={{
                background: "linear-gradient(135deg, #00f2fe 0%, #4facfe 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              Publicaciones
            </span>
          </h1>
          <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.95rem" }}>
            Explora el contenido de nuestra comunidad.
          </p>
        </div>

        {/* Divisor decorativo */}
        <div className="d-flex align-items-center mb-4">
          <div style={{ height: "2px", flex: 1, background: "linear-gradient(to right, transparent, rgba(0,242,254,0.3))" }} />
          <span
            className="mx-3 fw-bold text-uppercase"
            style={{ color: "rgba(255,255,255,0.4)", letterSpacing: "3px", fontSize: "0.75rem" }}
          >
            {posts.length} publicación{posts.length !== 1 ? "es" : ""}
          </span>
          <div style={{ height: "2px", flex: 1, background: "linear-gradient(to left, transparent, rgba(0,242,254,0.3))" }} />
        </div>

        {posts.length === 0 ? (
          <div className="text-center py-5">
            <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>📝</div>
            <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "1.1rem" }}>No hay publicaciones todavía.</p>
          </div>
        ) : (
          <div className="row row-cols-1 row-cols-md-2 row-cols-lg-4 g-4">
            {posts.map((post) => (
              <div className="col" key={post.id}>
                <PostCard post={post} onView={() => navigate(`/posts/${post.id}`)} />
              </div>
            ))}
          </div>
        )}
      </div>

      <style>{`body { background: #0d1117 !important; }`}</style>
    </div>
  );
};

export default Posts;