import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { API_BASE } from "../api/backend";

// ── PLACEHOLDER SIN FOTOS ──
const NoPhotosPlaceholder = () => {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setIdx((p) => (p + 1) % 4), 2500);
    return () => clearInterval(id);
  }, []);

  const slides = [
    <div key="0" style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center" }}>
      <div style={{ textAlign: "center", color: "rgba(255,255,255,0.65)", position: "relative", zIndex: 1 }}>
        <div style={{ fontSize: "44px", marginBottom: "8px" }}>📝</div>
        <div style={{ fontWeight: 800, letterSpacing: "2px", fontSize: "11px", color: "rgba(255,255,255,0.45)" }}>PUBLICACIÓN</div>
        <div style={{ fontSize: "11px", marginTop: "4px", color: "rgba(255,255,255,0.35)" }}>Añade fotos para darle vida</div>
      </div>
    </div>,
    <div key="1" style={{ position: "absolute", inset: 0 }}>
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(circle at 20% 30%, rgba(0,242,254,0.2), transparent 50%), radial-gradient(circle at 75% 25%, rgba(79,172,254,0.15), transparent 50%)" }} />
      <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "44px", marginBottom: "8px" }}>🏙️</div>
          <div style={{ fontWeight: 800, letterSpacing: "2px", fontSize: "11px", color: "rgba(255,255,255,0.45)" }}>DESTINO</div>
          <div style={{ fontSize: "11px", marginTop: "4px", color: "rgba(255,255,255,0.35)" }}>Convierte esto en una galería</div>
        </div>
      </div>
    </div>,
    <div key="2" style={{ position: "absolute", inset: 0 }}>
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(135deg, rgba(0,242,254,0.15), rgba(79,172,254,0.15), rgba(0,242,254,0.1))" }} />
      <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "44px", marginBottom: "8px" }}>✍️</div>
          <div style={{ fontWeight: 800, letterSpacing: "2px", fontSize: "11px", color: "rgba(255,255,255,0.45)" }}>HISTORIA</div>
          <div style={{ fontSize: "11px", marginTop: "4px", color: "rgba(255,255,255,0.35)" }}>Sube fotos de tu experiencia</div>
        </div>
      </div>
    </div>,
    <div key="3" style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center" }}>
      <div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 56px)", gap: "10px", marginBottom: "10px" }}>
          {["🏨", "🍽️", "📍", "🎭"].map((ic, i) => (
            <div key={i} style={{
              width: "56px", height: "56px", display: "grid", placeItems: "center",
              borderRadius: "14px", background: "rgba(0,242,254,0.07)",
              border: "1px solid rgba(0,242,254,0.15)", fontSize: "24px"
            }}>{ic}</div>
          ))}
        </div>
        <div style={{ textAlign: "center", color: "rgba(255,255,255,0.35)", fontSize: "11px", letterSpacing: "1px" }}>VISTA TEMÁTICA</div>
      </div>
    </div>
  ];

  return (
    <div style={{ position: "relative", height: "220px", background: "#1a1a2e", overflow: "hidden" }}>
      {slides[idx]}
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "50px", background: "linear-gradient(to top, rgba(13,17,23,0.9), transparent)" }} />
      <div style={{ position: "absolute", bottom: "8px", left: "50%", transform: "translateX(-50%)", display: "flex", gap: "6px", zIndex: 2 }}>
        {[0, 1, 2, 3].map((d) => (
          <div key={d} onClick={() => setIdx(d)} style={{
            width: d === idx ? "18px" : "6px", height: "6px", borderRadius: "3px",
            background: d === idx ? "#00f2fe" : "rgba(255,255,255,0.35)",
            cursor: "pointer", transition: "all 0.25s ease"
          }} />
        ))}
      </div>
    </div>
  );
};

// Helper para extraer autor
const getAuthor = (p = {}) => {
  const source = p.user || p.author || p.created_by || (p.user_name ? { name: p.user_name } : null) || null;
  const name =
    (source && (source.name || source.username)) ||
    p.user_name || p.author_name || p.username ||
    (typeof p.author === "string" ? p.author : null) ||
    "Anónimo";
  const avatar = (source && (source.avatar || source.picture || source.photo)) || p.user_avatar || p.avatar || null;
  const id = (source && (source.id || source._id)) || null;
  return { name, avatar, id };
};

// ── POST CARD COMPARTIDA ──
const PostCard = ({
  title, content, image, images, date, category, onReadMore,
  post,
  onEdit, onDelete, onView,
  showActions = false,
  showAuthor = true
}) => {
  const [currentPhoto, setCurrentPhoto] = useState(0);
  const navigate = useNavigate();

  const _title = post?.title ?? title;
  const _content = post?.content ?? content;
  const _image = post?.image ?? image;
  const _images = post?.images ?? images;
  const _date = post?.created_at ? new Date(post.created_at).toLocaleDateString() : (date ?? "");
  const _category = post?.category ?? category;

  const normalizeUrl = (url) => {
    if (!url || typeof url !== "string") return null;
    if (url.startsWith("/")) return `${API_BASE}${url}`;
    return url;
  };

  const getPhotos = () => {
    if (_images && Array.isArray(_images) && _images.length > 0) {
      return _images
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
        .map(img => normalizeUrl(typeof img === "object" ? img.url : img))
        .filter(Boolean);
    }
    if (_image) {
      const raw = Array.isArray(_image) ? _image : [_image];
      return raw.map(img => {
        const url = typeof img === "object" ? (img.url || img.path) : img;
        return normalizeUrl(url);
      }).filter(Boolean);
    }
    return [];
  };

  const photos = getPhotos();

  useEffect(() => {
    if (photos.length <= 1) return;
    const interval = setInterval(() => setCurrentPhoto(prev => (prev + 1) % photos.length), 2500);
    return () => clearInterval(interval);
  }, [photos.length]);

  const categoryIcons = { hoteles: "🏨", restaurantes: "🍽️", bares: "🍹", lugares: "📍", cultura: "🎭", otros: "✨" };
  const cat = _category ? _category.toString().trim().toLowerCase() : "";

  const originalReadHandler = onView ?? onReadMore;

  const handleReadMoreClick = () => {
    if (typeof originalReadHandler === "function") originalReadHandler();
  };

  const { name: authorName, avatar, id: authorId } = getAuthor(post || {});

  return (
    <div
      className="h-100 rounded-4 overflow-hidden"
      style={{
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.08)",
        transition: "all 0.3s ease",
        display: "flex", flexDirection: "column"
      }}
      onMouseOver={(e) => e.currentTarget.style.border = "1px solid rgba(0,242,254,0.5)"}
      onMouseOut={(e) => e.currentTarget.style.border = "1px solid rgba(255,255,255,0.08)"}
    >
      {/* ── ÁREA DE FOTO ── */}
      <div style={{ position: "relative", height: "220px", background: "#1a1a2e", overflow: "hidden" }}>
        {photos.length > 0 ? (
          <>
            <img
              src={photos[currentPhoto]}
              alt={_title}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                objectPosition: "center center",
                display: "block",
                transition: "opacity 0.6s ease"
              }}
              onError={(e) => { e.target.style.display = "none"; }}
            />
            <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "60px", background: "linear-gradient(to top, rgba(13,17,23,0.9), transparent)" }} />
            {photos.length > 1 && (
              <div style={{ position: "absolute", bottom: "8px", left: "50%", transform: "translateX(-50%)", display: "flex", gap: "5px" }}>
                {photos.map((_, i) => (
                  <div key={i} onClick={() => setCurrentPhoto(i)} style={{
                    width: i === currentPhoto ? "18px" : "6px", height: "6px", borderRadius: "3px",
                    background: i === currentPhoto ? "#00f2fe" : "rgba(255,255,255,0.4)",
                    cursor: "pointer", transition: "all 0.3s ease"
                  }} />
                ))}
              </div>
            )}
            <span style={{
              position: "absolute", top: "10px", right: "10px",
              background: "rgba(0,0,0,0.6)", color: "#00f2fe",
              fontSize: "0.7rem", padding: "2px 8px", borderRadius: "20px", backdropFilter: "blur(4px)"
            }}>📷 {photos.length}</span>
          </>
        ) : (
          <NoPhotosPlaceholder />
        )}

        {_category && (
          <span style={{
            position: "absolute", top: "10px", left: "10px",
            background: "rgba(0,242,254,0.15)", color: "#00f2fe",
            border: "1px solid rgba(0,242,254,0.4)",
            fontSize: "0.7rem", padding: "3px 10px", borderRadius: "20px",
            backdropFilter: "blur(4px)", fontWeight: "bold", zIndex: 2
          }}>
            {categoryIcons[cat] || "📍"} {_category}
          </span>
        )}
      </div>

      {/* ── CUERPO ── */}
      <div className="p-3 d-flex flex-column" style={{ flex: 1 }}>
        <div className="d-flex justify-content-between align-items-start mb-2">
          <h5 className="fw-bold mb-0" style={{ color: "#fff", fontSize: "1rem", lineHeight: "1.3" }}>
            {_title}
          </h5>
          {_date && (
            <small style={{ color: "rgba(255,255,255,0.3)", fontSize: "0.7rem", whiteSpace: "nowrap", marginLeft: "8px" }}>
              {_date}
            </small>
          )}
        </div>

        {showAuthor && (
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
            {avatar ? (
              <img src={normalizeUrl(avatar)} alt={authorName} style={{ width: 28, height: 28, borderRadius: "50%", objectFit: "cover", border: "1px solid rgba(255,255,255,0.06)" }} />
            ) : (
              <div style={{ width: 28, height: 28, borderRadius: "50%", display: "grid", placeItems: "center", background: "linear-gradient(135deg,#f9d423,#ff4e50)", color: "#081018", fontWeight: 800 }}>
                {authorName ? authorName.charAt(0).toUpperCase() : "A"}
              </div>
            )}
            <Link
              to={`/profile/${authorId}`}
              style={{ color: "#00f2fe", fontWeight: "800", textDecoration: "underline", cursor: "pointer" }}
            >
              {authorName}
            </Link>
          </div>
        )}

        {_content && (
          <p style={{
            color: "rgba(255,255,255,0.5)", fontSize: "0.8rem",
            marginBottom: "12px", lineHeight: "1.4",
            display: "-webkit-box", WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical", overflow: "hidden"
          }}>
            {_content}
          </p>
        )}

        {photos.length > 0 && (
          <div className="mb-3" style={{ color: "rgba(255,255,255,0.35)", fontSize: "0.75rem" }}>
            <span>📷 {photos.length} foto{photos.length !== 1 ? "s" : ""}</span>
          </div>
        )}

        <div className="d-flex gap-2 mt-auto">
          <button
            onClick={handleReadMoreClick}
            className="btn btn-sm fw-bold rounded-pill flex-grow-1"
            style={{
              background: "linear-gradient(135deg, #00f2fe 0%, #4facfe 100%)",
              border: "none", color: "#000", fontSize: "0.8rem"
            }}
          >
            📖 Leer más
          </button>

          {(showActions || onEdit) && (
            <button
              onClick={onEdit}
              className="btn btn-sm rounded-circle d-flex align-items-center justify-content-center"
              style={{
                background: "rgba(0,242,254,0.1)", color: "#00f2fe",
                border: "1px solid rgba(0,242,254,0.3)",
                width: "34px", height: "34px", flexShrink: 0
              }}
              title="Editar"
            >✏️</button>
          )}

          {(showActions || onDelete) && (
            <button
              onClick={onDelete}
              className="btn btn-sm rounded-circle d-flex align-items-center justify-content-center"
              style={{
                background: "rgba(220,53,69,0.15)", color: "#ff6b7a",
                border: "1px solid rgba(220,53,69,0.4)",
                width: "34px", height: "34px", flexShrink: 0
              }}
              title="Eliminar"
            >🗑️</button>
          )}
        </div>
      </div>
    </div>
  );
};

export default PostCard;