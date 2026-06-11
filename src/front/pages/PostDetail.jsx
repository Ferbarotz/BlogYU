import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { API_BASE } from "../api/backend";

const PostDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [post, setPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [loading, setLoading] = useState(true);
  const [activeImg, setActiveImg] = useState(0);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalImgIndex, setModalImgIndex] = useState(0);

  const user = JSON.parse(localStorage.getItem("user") || "null");

  const getImages = (data) => {
    if (!data) return [];

    const clean = (url) => {
      if (!url || typeof url !== "string") return null;
      if (url.startsWith("/")) return `${API_BASE}${url}`;
      if (url.startsWith("http")) return url;
      return url;
    };

    if (data.images && Array.isArray(data.images) && data.images.length > 0) {
      return data.images
        .sort((a, b) => a.order - b.order)
        .map(img => clean(img.url))
        .filter(Boolean);
    }

    if (data.image) {
      const raw = data.image;
      return (Array.isArray(raw) ? raw : [raw]).map(clean).filter(Boolean);
    }

    return [];
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [pRes, cRes] = await Promise.all([
          fetch(`${API_BASE}/api/posts/${id}`),
          fetch(`${API_BASE}/api/posts/${id}/comments`)
        ]);
        if (pRes.ok) setPost(await pRes.json());
        if (cRes.ok) setComments(await cRes.json());
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    };
    fetchData();
  }, [id]);

  const handleSendComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    try {
      const res = await fetch(`${API_BASE}/api/posts/${id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: newComment, author_name: user?.name || "Invitado", user_id: user?.id })
      });
      if (res.ok) {
        setComments([...comments, await res.json()]);
        setNewComment("");
      }
    } catch (err) { console.error(err); }
  };

  const openModal = (index) => {
    setModalImgIndex(index);
    setModalOpen(true);
  };

  const closeModal = () => setModalOpen(false);

  const prevPhoto = (e) => {
    e.stopPropagation();
    setModalImgIndex(i => (i === 0 ? images.length - 1 : i - 1));
  };

  const nextPhoto = (e) => {
    e.stopPropagation();
    setModalImgIndex(i => (i === images.length - 1 ? 0 : i + 1));
  };

  if (loading) return (
    <div style={{ minHeight: "100vh", background: "#0d1117", color: "#00f2fe", display: "flex", alignItems: "center", justifyContent: "center" }}>
      Cargando...
    </div>
  );

  if (!post) return (
    <div style={{ minHeight: "100vh", background: "#0d1117", color: "#fff", textAlign: "center", padding: "50px" }}>
      Post no encontrado
    </div>
  );

  const images = getImages(post);

  return (
    <div style={{ minHeight: "100vh", background: "#0d1117", color: "#fff", padding: "3rem 1rem" }}>
      <div className="container" style={{ maxWidth: "900px" }}>
        <button
          onClick={() => navigate(-1)}
          style={{
            background: "transparent",
            border: "none",
            color: "#00f2fe",
            cursor: "pointer",
            marginBottom: "24px",
            fontSize: "0.9rem",
            fontWeight: "600"
          }}
        >
          ← Volver
        </button>

        {/* HEADER POST */}
        <div style={{
          background: "#121026",
          borderRadius: "16px",
          border: "1px solid #00f2fe",
          padding: "2rem",
          marginBottom: "2rem",
          boxShadow: "0 0 15px #00f2fe33"
        }}>
          <h2 style={{ fontWeight: "900", fontSize: "2rem", marginBottom: "0.5rem", color: "#00f2fe" }}>{post.title}</h2>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem", color: "#a0cfff", fontSize: "0.9rem" }}>
            <span>📍 <span style={{ color: "#f9d423" }}>{post.category || "Sin categoría"}</span></span>
            <span>📅 {new Date(post.created_at).toLocaleDateString("es-ES", { year: "numeric", month: "long", day: "numeric" })}</span>
            <span>✍️ Por <Link to={`/profile/${post.author?.id}`} style={{ color: "#f9d423", fontWeight: "600" }}>{post.author?.name || post.author?.email || "Anónimo"}</Link></span>
          </div>
        </div>

        {/* IMÁGENES */}
        {images.length > 0 && (
          <div style={{
            background: "#121026",
            borderRadius: "16px",
            border: "1px solid #00f2fe",
            padding: "1rem",
            marginBottom: "2rem",
            boxShadow: "0 0 15px #00f2fe33"
          }}>
            <img
              src={images[activeImg]}
              alt={`Imagen principal ${activeImg + 1}`}
              style={{
                width: "100%",
                height: "450px",
                objectFit: "contain",
                background: "#000",
                borderRadius: "12px",
                cursor: "pointer",
                boxShadow: "0 0 20px #00f2fe"
              }}
              onClick={() => openModal(activeImg)}
            />
            <div style={{ display: "flex", gap: "0.5rem", marginTop: "1rem", overflowX: "auto" }}>
              {images.map((img, i) => (
                <img
                  key={i}
                  src={img}
                  alt={`Miniatura ${i + 1}`}
                  onClick={() =>  setActiveImg(i)}
                  style={{
                    width: "80px",
                    height: "60px",
                    objectFit: "cover",
                    borderRadius: "8px",
                    cursor: "pointer",
                    border: activeImg === i ? "2px solid #00f2fe" : "2px solid transparent",
                    boxShadow: activeImg === i ? "0 0 8px #00f2fe" : "none",
                    flexShrink: 0
                  }}
                />
              ))}
            </div>
          </div>
        )}

        {/* CONTENIDO */}
        <div style={{
          background: "#121026",
          borderRadius: "16px",
          padding: "2rem",
          fontSize: "1.1rem",
          lineHeight: "1.8",
          marginBottom: "3rem",
          whiteSpace: "pre-wrap",
          boxShadow: "0 0 15px #00f2fe33"
        }}>
          {post.content}
        </div>

        {/* COMENTARIOS */}
        <div>
          <h4 style={{ marginBottom: "1rem", color: "#00f2fe" }}>Comentarios ({comments.length})</h4>
          {comments.map(c => (
            <div key={c.id} style={{
              background: "#121026",
              border: "1px solid #00f2fe",
              borderRadius: "12px",
              padding: "1rem",
              marginBottom: "1rem",
              boxShadow: "0 0 10px #00f2fe22"
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem", color: "#a0cfff" }}>
                <strong style={{ color: "#00f2fe" }}>{c.author_name}</strong>
                <small>{new Date(c.created_at).toLocaleDateString()}</small>
              </div>
              <p style={{ margin: 0 }}>{c.content}</p>
            </div>
          ))}

          <form onSubmit={handleSendComment} style={{
            background: "#121026",
            borderRadius: "16px",
            padding: "1.5rem",
            marginTop: "2rem",
            boxShadow: "0 0 15px #00f2fe33"
          }}>
            <h5 style={{ marginBottom: "1rem", color: "#00f2fe" }}>Deja tu opinión</h5>
            <textarea
              className="form-control bg-dark text-white border-secondary mb-3"
              rows="3"
              value={newComment}
              onChange={e => setNewComment(e.target.value)}
              placeholder="Escribe aquí..."
              required
              style={{ resize: "vertical" }}
            />
            <button type="submit" className="btn btn-info w-100 fw-bold" style={{ background: "linear-gradient(135deg, #00f2fe 0%, #4facfe 100%)", border: "none" }}>
              Publicar Comentario
            </button>
          </form>
        </div>
      </div>

      {/* Modal fotos ampliadas */}
      {modalOpen && (
        <div
          onClick={closeModal}
          style={{
            position: "fixed",
            top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: "rgba(0, 15, 30, 0.95)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 9999,
            cursor: "pointer",
            backdropFilter: "blur(8px)"
          }}
        >
          <button
            onClick={prevPhoto}
            style={{
              position: "absolute",
              left: "20px",
              top: "50%",
              transform: "translateY(-50%)",
              fontSize: "2.5rem",
              color: "#00f2fe",
              background: "none",
              border: "none",
              cursor: "pointer",
              userSelect: "none"
            }}
            aria-label="Foto anterior"
          >
            ‹
          </button>

          <img
            src={images[modalImgIndex]}
            alt={`Foto ampliada ${modalImgIndex + 1}`}
            style={{ maxHeight: "80vh", maxWidth: "80vw", borderRadius: "16px", boxShadow: "0 0 30px #00f2fe" }}
            onClick={e => e.stopPropagation()}
          />

          <button
            onClick={nextPhoto}
            style={{
              position: "absolute",
              right: "20px",
              top: "50%",
              transform: "translateY(-50%)",
              fontSize: "2.5rem",
              color: "#00f2fe",
              background: "none",
              border: "none",
              cursor: "pointer",
              userSelect: "none"
            }}
            aria-label="Foto siguiente"
          >
            ›
          </button>
        </div>
      )}
    </div>
  );
};

export default PostDetail;