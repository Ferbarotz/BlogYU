import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { API_BASE, authHeaders } from "../api/backend";

const MyPosts = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchMyPosts = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/my-posts`, {
          headers: { ...authHeaders() }
        });
        const data = await res.json();
        if (res.ok) setPosts(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchMyPosts();
  }, []);

  const handleDelete = async (id) => {
    if (!confirm("¿Eliminar esta publicación?")) return;
    try {
      const res = await fetch(`${API_BASE}/api/posts/${id}`, {
        method: "DELETE",
        headers: { ...authHeaders() }
      });
      if (res.ok) {
        setPosts(posts.filter(p => p.id !== id));
      } else {
        const data = await res.json();
        alert(data.msg || "Error al eliminar");
      }
    } catch (err) {
      console.error(err);
      alert("Error de conexión");
    }
  };

  const defaultImage = "https://images.unsplash.com/photo-1499750310107-5fef28a66643?auto=format&fit=crop&w=800&q=80";

  return (
    <div className="container py-5" style={{ maxWidth: "900px" }}>
      {/* Encabezado */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
        <h2 className="fw-bold mb-0">Mis Publicaciones</h2>
        <Link
          to="/new-post"
          className="btn btn-success btn-sm"
        >
          + Nueva publicación
        </Link>
      </div>

      {/* Estados */}
      {loading ? (
        <p className="text-muted">Cargando...</p>
      ) : posts.length === 0 ? (
        <p className="text-muted">No tienes publicaciones aún.</p>
      ) : (
        /* Lista de posts */
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {posts.map(p => {
            let img = p.image;
            if (img && img.startsWith("/")) img = `${API_BASE}${img}`;

            return (
              <div
                key={p.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "16px",
                  padding: "12px 16px",
                  border: "1px solid #e0e0e0",
                  borderRadius: "10px",
                  backgroundColor: "#fff",
                  boxShadow: "0 1px 4px rgba(0,0,0,0.06)"
                }}
              >
                {/* Imagen pequeña */}
                <img
                  src={img || defaultImage}
                  alt={p.title}
                  onError={(e) => { e.target.onerror = null; e.target.src = defaultImage; }}
                  style={{
                    width: "70px",
                    height: "70px",
                    objectFit: "cover",
                    borderRadius: "8px",
                    flexShrink: 0
                  }}
                />

                {/* Título y fecha */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p
                    className="fw-bold mb-0"
                    style={{
                      fontSize: "1rem",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis"
                    }}
                  >
                    {p.title}
                  </p>
                  <p className="text-muted mb-0" style={{ fontSize: "0.75rem" }}>
                    {new Date(p.created_at).toLocaleDateString()}
                  </p>
                </div>

                {/* Botones */}
                <div style={{ display: "flex", gap: "8px", flexShrink: 0 }}>
                  <button
                    onClick={() => navigate(`/posts/${p.id}`)}
                    className="btn btn-outline-primary btn-sm"
                  >
                    Leer
                  </button>
                  <button
                    onClick={() => navigate(`/posts/${p.id}/edit`)}
                    className="btn btn-warning btn-sm"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => handleDelete(p.id)}
                    className="btn btn-danger btn-sm"
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default MyPosts;