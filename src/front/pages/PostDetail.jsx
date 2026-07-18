import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { API_BASE } from "../api/backend";

// Paleta de marca para PUBLICACIONES (azul)
const C_START = "#00f2fe";
const C_END = "#4facfe";

const PostDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [post, setPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [loading, setLoading] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalImgIndex, setModalImgIndex] = useState(0);

  const user = JSON.parse(localStorage.getItem("user") || "null");
  const isLoggedIn = !!user; // true si hay sesión activa

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
        .slice()
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
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
  const prevPhoto = (e) => { e.stopPropagation(); setModalImgIndex(i => (i === 0 ? images.length - 1 : i - 1)); };
  const nextPhoto = (e) => { e.stopPropagation(); setModalImgIndex(i => (i === images.length - 1 ? 0 : i + 1)); };

  if (loading) return (
    <div className="d-flex justify-content-center align-items-center" style={{ minHeight: "100vh", background: "#0d1117" }}>
      <div className="text-center">
        <div className="spinner-border mb-3" style={{ color: C_START, width: "3rem", height: "3rem" }}></div>
        <p style={{ color: C_START }}>Cargando publicación...</p>
      </div>
    </div>
  );

  if (!post) return (
    <div className="d-flex justify-content-center align-items-center" style={{ minHeight: "100vh", background: "#0d1117" }}>
      <div className="text-center">
        <p style={{ fontSize: "3rem", color: C_START }}>😕</p>
        <h4 style={{ color: C_END }}>Publicación no encontrada</h4>
        <div className="d-flex gap-2 justify-content-center mt-3 flex-wrap">
          <button
            onClick={() => navigate('/my-posts')}
            className="btn"
            style={{ background: `linear-gradient(135deg, ${C_START} 0%, ${C_END} 100%)`, color: "#000", border: "none", borderRadius: "10px", fontWeight: 700 }}
          >
            ← Mis publicaciones
          </button>
          <button
            onClick={() => navigate('/')}
            className="btn"
            style={{ background: "transparent", color: C_START, border: `1px solid ${C_START}59`, borderRadius: "10px", fontWeight: 600 }}
          >
            🏠 Ir al Home
          </button>
        </div>
      </div>
    </div>
  );

  const images = getImages(post);
  const totalPhotos = images.length;
  const totalComments = comments.length;

  return (
    <div style={{
      margin: 0,
      paddingTop: '20px',
      paddingBottom: '120px',
      paddingLeft: '1rem',
      paddingRight: '1rem',
      background: "#0d1117",
      color: "#e0e0e0",
      minHeight: "100vh",
    }}>
      <div className="container" style={{ maxWidth: "1000px", marginTop: 0, paddingTop: 0 }}>

        {/* HEADER CON HERO */}
        <div className="mb-4" style={{
          background: `linear-gradient(135deg, rgba(0,242,254,0.08) 0%, rgba(79,172,254,0.08) 100%)`,
          borderRadius: "24px",
          border: `1px solid rgba(0,242,254,0.2)`,
          boxShadow: "0 8px 32px rgba(0,242,254,0.15)",
          overflow: "hidden"
        }}>
          <div className="p-4 p-md-5">
            {/* Título principal */}
            <h1 className="fw-bold mb-3" style={{
              color: C_START,
              fontSize: "clamp(1.75rem, 4vw, 3rem)",
              marginTop: 0,
              lineHeight: "1.2",
              textShadow: "0 2px 8px rgba(0,242,254,0.3)"
            }}>
              {post.title || 'Publicación sin título'}
            </h1>

            {/* Stats Compactos */}
            <div className="d-flex flex-wrap gap-2 mb-4">
              <div style={{ background: "rgba(0,242,254,0.08)", border: "1px solid rgba(0,242,254,0.25)", borderRadius: "12px", padding: "8px 14px", display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontSize: "1.2rem" }}>📸</span>
                <div>
                  <div style={{ fontSize: "1rem", fontWeight: "700", color: C_START, lineHeight: "1.2" }}>{totalPhotos}</div>
                  <div style={{ fontSize: "0.65rem", color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                    {totalPhotos === 1 ? 'Foto' : 'Fotos'}
                  </div>
                </div>
              </div>

              <div style={{ background: "rgba(79,172,254,0.08)", border: "1px solid rgba(79,172,254,0.25)", borderRadius: "12px", padding: "8px 14px", display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontSize: "1.2rem" }}>💬</span>
                <div>
                  <div style={{ fontSize: "1rem", fontWeight: "700", color: C_END, lineHeight: "1.2" }}>{totalComments}</div>
                  <div style={{ fontSize: "0.65rem", color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                    {totalComments === 1 ? 'Comentario' : 'Comentarios'}
                  </div>
                </div>
              </div>

              <div style={{ background: "rgba(0,242,254,0.08)", border: "1px solid rgba(0,242,254,0.25)", borderRadius: "12px", padding: "8px 14px", display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontSize: "1.2rem" }}>📅</span>
                <div>
                  <div style={{ fontSize: "0.8rem", fontWeight: "600", color: C_START, lineHeight: "1.2" }}>
                    {post.created_at ? new Date(post.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                  </div>
                  <div style={{ fontSize: "0.65rem", color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                    Publicada
                  </div>
                </div>
              </div>
            </div>

            {/* Autor */}
            {post.author && (
              <div className="d-flex align-items-center gap-3 pt-3" style={{ borderTop: "1px solid rgba(0,242,254,0.2)" }}>
                <div style={{
                  width: "48px", height: "48px", borderRadius: "50%",
                  background: `linear-gradient(135deg, ${C_START}, ${C_END})`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "1.5rem", fontWeight: "700", color: "#000"
                }}>
                  {(post.author.name || post.author.email || '?')[0].toUpperCase()}
                </div>
                <div>
                  <div style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: "1px" }}>
                    Escrito por
                  </div>
                  <Link
                    to={`/profile/${post.author.id}`}
                    style={{ color: C_START, fontSize: "1rem", fontWeight: "600", textDecoration: "none", transition: "all 0.2s ease" }}
                    onMouseOver={e => e.currentTarget.style.textShadow = "0 0 8px rgba(0,242,254,0.6)"}
                    onMouseOut={e => e.currentTarget.style.textShadow = "none"}
                  >
                    {post.author.name || post.author.email}
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* GALERÍA DE IMÁGENES — miniaturas compactas */}
        {images.length > 0 && (
          <div className="mb-5">
            <div className="mb-2 d-flex align-items-center gap-2" style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.8rem", fontWeight: 600 }}>
              <span style={{ fontSize: "1rem" }}>📸</span>
              {images.length} {images.length === 1 ? 'foto' : 'fotos'}
              {images.length > 1 && (
                <span style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.35)" }}>· toca para ampliar</span>
              )}
            </div>

            {/* Tira horizontal scrollable de miniaturas */}
            <div style={{
              display: "flex",
              gap: "8px",
              overflowX: "auto",
              paddingBottom: "6px",
              /* scrollbar delgado */
              scrollbarWidth: "thin",
              scrollbarColor: "rgba(0,242,254,0.3) transparent"
            }}>
              {images.map((src, i) => (
                <div
                  key={i}
                  onClick={() => openModal(i)}
                  style={{
                    flexShrink: 0,
                    width: "90px",
                    height: "90px",
                    borderRadius: "10px",
                    overflow: "hidden",
                    cursor: "pointer",
                    border: `1.5px solid rgba(0,242,254,0.25)`,
                    boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
                    transition: "all 0.25s ease"
                  }}
                  onMouseOver={e => {
                    e.currentTarget.style.transform = "scale(1.08)";
                    e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,242,254,0.4)";
                    e.currentTarget.style.borderColor = C_START;
                  }}
                  onMouseOut={e => {
                    e.currentTarget.style.transform = "scale(1)";
                    e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.3)";
                    e.currentTarget.style.borderColor = "rgba(0,242,254,0.25)";
                  }}
                >
                  <img
                    src={src}
                    alt={`Foto ${i + 1}`}
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    onError={(e) => { e.target.src = "https://placehold.co/200?text=Sin+imagen"; }}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CONTENIDO */}
        <div className="mb-5">
          <h5 className="mb-3 d-flex align-items-center gap-2" style={{ color: C_START, fontSize: "1.3rem" }}>
            <span>📝</span>
            La historia
          </h5>
          <div style={{
            background: `linear-gradient(135deg, rgba(0,242,254,0.04) 0%, rgba(79,172,254,0.04) 100%)`,
            borderRadius: "20px",
            border: "1px solid rgba(0,242,254,0.2)",
            boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
            padding: "2rem",
            fontSize: "1.05rem",
            lineHeight: "1.8",
            whiteSpace: "pre-wrap",
            color: "rgba(255,255,255,0.85)"
          }}>
            {post.content}
          </div>
        </div>

        {/* COMENTARIOS */}
        <div className="mb-4">
          <h5 className="mb-4 d-flex align-items-center gap-2" style={{ color: C_START, fontSize: "1.3rem" }}>
            <span>💬</span>
            Comentarios
            <span style={{ fontSize: "0.8rem", fontWeight: 400, color: "rgba(255,255,255,0.5)", background: "rgba(0,242,254,0.1)", padding: "4px 12px", borderRadius: "12px" }}>
              {totalComments}
            </span>
          </h5>

          {comments.map(c => (
            <div key={c.id} style={{
              background: `linear-gradient(135deg, rgba(0,242,254,0.04) 0%, rgba(79,172,254,0.04) 100%)`,
              border: "1px solid rgba(0,242,254,0.2)",
              borderRadius: "16px",
              padding: "1rem 1.25rem",
              marginBottom: "1rem",
              boxShadow: "0 4px 12px rgba(0,0,0,0.25)"
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem", color: "rgba(255,255,255,0.5)" }}>
                <strong style={{ color: C_START }}>{c.author_name}</strong>
                <small>{c.created_at ? new Date(c.created_at).toLocaleDateString() : ""}</small>
              </div>
              <p style={{ margin: 0, color: "rgba(255,255,255,0.85)" }}>{c.content}</p>
            </div>
          ))}

          {comments.length === 0 && (
            <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.9rem", marginBottom: "1.5rem" }}>
              Sé el primero en comentar ✨
            </p>
          )}

          <form onSubmit={handleSendComment} style={{
            background: `linear-gradient(135deg, rgba(0,242,254,0.06) 0%, rgba(79,172,254,0.06) 100%)`,
            border: "1px solid rgba(0,242,254,0.25)",
            borderRadius: "20px",
            padding: "1.5rem",
            marginTop: "1.5rem",
            boxShadow: "0 4px 20px rgba(0,0,0,0.3)"
          }}>
            <h6 style={{ marginBottom: "1rem", color: C_START, fontWeight: 700 }}>Deja tu opinión</h6>
            <textarea
              className="form-control mb-3"
              rows="3"
              value={newComment}
              onChange={e => setNewComment(e.target.value)}
              placeholder="Escribe aquí..."
              required
              style={{ resize: "vertical", background: "rgba(0,0,0,0.25)", color: "#fff", border: "1px solid rgba(0,242,254,0.25)" }}
            />
            <button type="submit" className="btn w-100 fw-bold" style={{ background: `linear-gradient(135deg, ${C_START} 0%, ${C_END} 100%)`, border: "none", color: "#000", borderRadius: "12px" }}>
              Publicar Comentario
            </button>
          </form>
        </div>

        {/* Barra de navegación fija (sutil) */}
        <div style={{
          position: "fixed",
          left: "50%",
          bottom: "16px",
          transform: "translateX(-50%)",
          width: "min(560px, calc(100% - 24px))",
          zIndex: 1200,
          background: "rgba(13,17,23,0.55)",
          border: "1px solid rgba(0,242,254,0.15)",
          borderRadius: "14px",
          backdropFilter: "blur(10px)",
          WebkitBackdropFilter: "blur(10px)",
          padding: "8px",
          boxShadow: "0 8px 20px rgba(0,0,0,0.25)",
          opacity: 0.72,
          transition: "opacity 0.25s ease"
        }}
          onMouseOver={e => e.currentTarget.style.opacity = 1}
          onMouseOut={e => e.currentTarget.style.opacity = 0.72}
        >
          <div className="d-flex gap-2">
            {isLoggedIn ? (
              <>
                <button
                  type="button"
                  onClick={() => navigate('/my-posts')}
                  className="btn btn-sm fw-semibold rounded-pill flex-grow-1"
                  style={{ background: "transparent", border: "1px solid rgba(0,242,254,0.3)", color: C_START, minHeight: "38px", fontSize: "0.85rem" }}
                >
                  ← Mis publicaciones
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/')}
                  className="btn btn-sm fw-semibold rounded-pill flex-grow-1"
                  style={{ background: "rgba(0,242,254,0.12)", border: "1px solid rgba(0,242,254,0.4)", color: C_START, minHeight: "38px", fontSize: "0.85rem" }}
                >
                  🏠 Home
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => navigate('/')}
                className="btn btn-sm fw-semibold rounded-pill w-100"
                style={{ background: "rgba(0,242,254,0.12)", border: "1px solid rgba(0,242,254,0.4)", color: C_START, minHeight: "38px", fontSize: "0.85rem" }}
              >
                🏠 Volver al Home
              </button>
            )}
          </div>
        </div>

        {/* Modal fotos ampliadas con navegación */}
        {modalOpen && (
          <div
            onClick={closeModal}
            style={{
              position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
              backgroundColor: "rgba(0, 10, 20, 0.96)",
              display: "flex", flexDirection: "column",
              justifyContent: "center", alignItems: "center",
              zIndex: 9999, cursor: "pointer", backdropFilter: "blur(12px)"
            }}
          >
            {/* Contador y cierre */}
            <div style={{
              position: "absolute", top: "16px", left: 0, right: 0,
              display: "flex", justifyContent: "center", alignItems: "center", gap: "12px"
            }}>
              <span style={{ color: "rgba(255,255,255,0.6)", fontSize: "0.85rem", fontWeight: 600, letterSpacing: "1px" }}>
                {modalImgIndex + 1} / {images.length}
              </span>
              <button
                onClick={closeModal}
                style={{
                  background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)",
                  color: "#fff", borderRadius: "50%", width: "32px", height: "32px",
                  cursor: "pointer", fontSize: "1rem", display: "flex", alignItems: "center", justifyContent: "center"
                }}
                aria-label="Cerrar"
              >✕</button>
            </div>

            {/* Flecha izquierda */}
            {images.length > 1 && (
              <button
                onClick={prevPhoto}
                style={{
                  position: "absolute", left: "16px", top: "50%", transform: "translateY(-50%)",
                  background: "rgba(0,242,254,0.15)", border: "1px solid rgba(0,242,254,0.35)",
                  color: C_START, borderRadius: "50%", width: "44px", height: "44px",
                  cursor: "pointer", fontSize: "1.4rem", display: "flex", alignItems: "center", justifyContent: "center",
                  zIndex: 1, transition: "all 0.2s ease"
                }}
                onMouseOver={e => e.currentTarget.style.background = "rgba(0,242,254,0.3)"}
                onMouseOut={e => e.currentTarget.style.background = "rgba(0,242,254,0.15)"}
                aria-label="Foto anterior"
              >‹</button>
            )}

            {/* Imagen ampliada */}
            <img
              src={images[modalImgIndex]}
              alt={`Foto ${modalImgIndex + 1}`}
              style={{
                maxHeight: "80vh", maxWidth: "88vw",
                borderRadius: "14px",
                boxShadow: `0 0 40px rgba(0,242,254,0.25)`,
                objectFit: "contain"
              }}
              onClick={e => e.stopPropagation()}
            />

            {/* Flecha derecha */}
            {images.length > 1 && (
              <button
                onClick={nextPhoto}
                style={{
                  position: "absolute", right: "16px", top: "50%", transform: "translateY(-50%)",
                  background: "rgba(0,242,254,0.15)", border: "1px solid rgba(0,242,254,0.35)",
                  color: C_START, borderRadius: "50%", width: "44px", height: "44px",
                  cursor: "pointer", fontSize: "1.4rem", display: "flex", alignItems: "center", justifyContent: "center",
                  zIndex: 1, transition: "all 0.2s ease"
                }}
                onMouseOver={e => e.currentTarget.style.background = "rgba(0,242,254,0.3)"}
                onMouseOut={e => e.currentTarget.style.background = "rgba(0,242,254,0.15)"}
                aria-label="Foto siguiente"
              >›</button>
            )}

            {/* Puntos indicadores */}
            {images.length > 1 && (
              <div style={{ position: "absolute", bottom: "20px", display: "flex", gap: "6px" }}>
                {images.map((_, i) => (
                  <div
                    key={i}
                    onClick={e => { e.stopPropagation(); setModalImgIndex(i); }}
                    style={{
                      width: i === modalImgIndex ? "20px" : "8px",
                      height: "8px",
                      borderRadius: "4px",
                      background: i === modalImgIndex ? C_START : "rgba(255,255,255,0.3)",
                      cursor: "pointer",
                      transition: "all 0.3s ease"
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
};

export default PostDetail;
