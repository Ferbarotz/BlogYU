import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { API_BASE, authHeaders } from "../api/backend";

const C_START = "#00f2fe";
const C_END = "#4facfe";

const PostDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [post, setPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [loading, setLoading] = useState(true);
  const [liking, setLiking] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editingCommentText, setEditingCommentText] = useState("");

  const user = JSON.parse(localStorage.getItem("user") || "null");
  const isLoggedIn = !!user;

  const fetchData = async () => {
    try {
      const [pRes, cRes] = await Promise.all([
        fetch(`${API_BASE}/api/posts/${id}`, { headers: authHeaders() }),
        fetch(`${API_BASE}/api/posts/${id}/comments`, { headers: authHeaders() }),
      ]);
      if (pRes.ok) setPost(await pRes.json());
      if (cRes.ok) setComments(await cRes.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  const images = useMemo(() => {
    if (!post) return [];
    const clean = (url) => {
      if (!url || typeof url !== "string") return null;
      if (url.startsWith("/")) return `${API_BASE}${url}`;
      return url;
    };
    if (Array.isArray(post.images) && post.images.length) {
      return post.images
        .slice()
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
        .map((img) => clean(img.url))
        .filter(Boolean);
    }
    if (post.image) return [clean(post.image)].filter(Boolean);
    return [];
  }, [post]);

  const handleLike = async () => {
    if (!isLoggedIn || !post || liking) return;
    setLiking(true);
    try {
      const res = await fetch(`${API_BASE}/api/posts/${id}/like`, {
        method: "POST",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
      });
      if (!res.ok) return;
      const data = await res.json();
      setPost((prev) => ({
        ...prev,
        like_count: data.likes_count,
        liked_by_me: data.liked_by_me,
      }));
    } catch (e) {
      console.error("Like error", e);
    } finally {
      setLiking(false);
    }
  };

  const handleSendComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    try {
      const res = await fetch(`${API_BASE}/api/posts/${id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ content: newComment }),
      });
      if (res.ok) {
        const added = await res.json();
        setComments((prev) => [...prev, added]);
        setNewComment("");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const startEditComment = (c) => {
    setEditingCommentId(c.id);
    setEditingCommentText(c.content || "");
  };

  const saveEditedComment = async (commentId) => {
    try {
      const res = await fetch(`${API_BASE}/api/posts/${id}/comments/${commentId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ content: editingCommentText }),
      });
      if (!res.ok) return;
      const updated = await res.json();
      setComments((prev) => prev.map((c) => (c.id === commentId ? updated : c)));
      setEditingCommentId(null);
      setEditingCommentText("");
    } catch (e) {
      console.error(e);
    }
  };

  const deleteComment = async (commentId) => {
    if (!window.confirm("¿Eliminar comentario?")) return;
    try {
      const res = await fetch(`${API_BASE}/api/posts/${id}/comments/${commentId}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      if (res.ok) {
        setComments((prev) => prev.filter((c) => c.id !== commentId));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const canDeleteComment = (c) => {
    if (!user) return false;
    const role = user.role || (user.is_admin ? "admin" : "user");
    return c.user_id === user.id || role === "moderator" || role === "admin";
  };

  if (loading) {
    return <div className="d-flex justify-content-center align-items-center" style={{ minHeight: "100vh", background: "#0d1117", color: C_START }}>Cargando publicación...</div>;
  }
  if (!post) {
    return <div className="d-flex justify-content-center align-items-center" style={{ minHeight: "100vh", background: "#0d1117", color: C_START }}>Publicación no encontrada</div>;
  }

  return (
    <div style={{ background: "#0d1117", color: "#fff", minHeight: "100vh", padding: "20px 0 120px" }}>
      <div className="container" style={{ maxWidth: 1000 }}>
        <h1 style={{ color: C_START }}>{post.title}</h1>
        <div className="d-flex flex-wrap gap-3 mb-3" style={{ color: "rgba(255,255,255,0.7)" }}>
          <span>📅 {post.created_at ? new Date(post.created_at).toLocaleDateString("es-ES") : "—"}</span>
          <span>👁️ {post.views || 0} vistas</span>
          <span>⏱️ {post.reading_time_minutes || 1} min de lectura</span>
          <button
            onClick={handleLike}
            disabled={!isLoggedIn || liking}
            style={{
              background: post.liked_by_me ? "rgba(249,212,35,0.2)" : "rgba(255,255,255,0.08)",
              border: "1px solid rgba(255,255,255,0.15)",
              color: post.liked_by_me ? "#f9d423" : "#fff",
              borderRadius: "999px",
              padding: "2px 12px",
            }}
          >
            {post.liked_by_me ? "💛" : "🤍"} {post.like_count || 0}
          </button>
        </div>

        {post.author && (
          <div className="mb-3">
            Autor: <Link to={`/profile/${post.author.id}`} style={{ color: C_START }}>{post.author.name || "Anónimo"}</Link>
          </div>
        )}

        {images.length > 0 && (
          <div className="row g-2 mb-4">
            {images.map((src, i) => (
              <div className="col-6 col-md-3" key={i}>
                <img src={src} alt={`Foto ${i + 1}`} style={{ width: "100%", height: 150, objectFit: "cover", borderRadius: 10 }} />
              </div>
            ))}
          </div>
        )}

        <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.7, marginBottom: 30 }}>{post.content}</div>

        <h4 style={{ color: C_START }}>Comentarios ({comments.length})</h4>
        {comments.map((c) => (
          <div key={c.id} style={{ border: "1px solid rgba(255,255,255,0.12)", borderRadius: 12, padding: 12, marginBottom: 12 }}>
            <div className="d-flex justify-content-between mb-2">
              <strong>{c.author_name}</strong>
              <small style={{ color: "rgba(255,255,255,0.6)" }}>{c.created_at ? new Date(c.created_at).toLocaleString() : ""}</small>
            </div>

            {editingCommentId === c.id ? (
              <>
                <textarea className="form-control mb-2" rows={3} value={editingCommentText} onChange={(e) => setEditingCommentText(e.target.value)} />
                <div className="d-flex gap-2">
                  <button className="btn btn-sm btn-success" onClick={() => saveEditedComment(c.id)}>Guardar</button>
                  <button className="btn btn-sm btn-secondary" onClick={() => setEditingCommentId(null)}>Cancelar</button>
                </div>
              </>
            ) : (
              <p style={{ margin: 0 }}>{c.content}</p>
            )}

            {isLoggedIn && editingCommentId !== c.id && (
              <div className="d-flex gap-2 mt-2">
                {c.user_id === user?.id && (
                  <button className="btn btn-sm btn-outline-info" onClick={() => startEditComment(c)}>Editar</button>
                )}
                {canDeleteComment(c) && (
                  <button className="btn btn-sm btn-outline-danger" onClick={() => deleteComment(c.id)}>Borrar</button>
                )}
              </div>
            )}
          </div>
        ))}

        {isLoggedIn ? (
          <form onSubmit={handleSendComment}>
            <textarea className="form-control mb-2" rows={3} value={newComment} onChange={(e) => setNewComment(e.target.value)} placeholder="Escribe un comentario..." required />
            <button type="submit" className="btn" style={{ background: `linear-gradient(135deg, ${C_START}, ${C_END})`, border: "none", color: "#000" }}>
              Publicar comentario
            </button>
          </form>
        ) : (
          <p style={{ color: "rgba(255,255,255,0.65)" }}>Inicia sesión para comentar y dar like.</p>
        )}

        <div className="mt-4 d-flex gap-2">
          <button className="btn btn-outline-info" onClick={() => navigate("/")}>🏠 Home</button>
          <button className="btn btn-outline-light" onClick={() => navigate(-1)}>← Volver</button>
        </div>
      </div>
    </div>
  );
};

export default PostDetail;
