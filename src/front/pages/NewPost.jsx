// src/front/pages/NewPost.jsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { API_BASE, authHeaders } from "../api/backend";

const DEFAULT_CATEGORIES = [
  { id: "hoteles",      name: "🏨 Hoteles" },
  { id: "restaurantes", name: "🍽️ Restaurantes" },
  { id: "bares",        name: "🍹 Bares" },
  { id: "lugares",      name: "📍 Lugares / Sitios" },
  { id: "cultura",      name: "🏛️ Cultura / Museos" },
  { id: "otros",        name: "✨ Otros" }
];

const MAX_PHOTOS = 10;

const NewPost = () => {
  const navigate = useNavigate();
  const [title, setTitle]           = useState("");
  const [content, setContent]       = useState("");
  const [imageFiles, setImageFiles] = useState([]);
  const [previews, setPreviews]     = useState([]);
  const [category, setCategory]     = useState(DEFAULT_CATEGORIES[0].id);
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);
  const [saving, setSaving]         = useState(false);
  const [error, setError]           = useState(null);
  const [dragOver, setDragOver]     = useState(false);

  useEffect(() => {
    let mounted = true;
    const fetchCategories = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/categories`);
        if (!res.ok) throw new Error("No categories endpoint");
        const data = await res.json();
        if (!mounted) return;
        if (Array.isArray(data) && data.length > 0) {
          const normalized = data.map(c =>
            typeof c === "string"
              ? { id: c, name: c }
              : { id: c.id ?? c.name, name: c.name ?? c.id }
          );
          setCategories(normalized);
          setCategory(normalized[0].id);
        }
      } catch {
        setCategories(DEFAULT_CATEGORIES);
        setCategory(DEFAULT_CATEGORIES[0].id);
      }
    };
    fetchCategories();
    return () => { mounted = false; };
  }, []);

  const addFiles = (files) => {
    const valid = Array.from(files).filter(f => f.type.startsWith("image/"));
    const remaining = MAX_PHOTOS - imageFiles.length;
    const toAdd = valid.slice(0, remaining);
    if (!toAdd.length) return;
    setImageFiles(prev => [...prev, ...toAdd]);
    toAdd.forEach(f => {
      const reader = new FileReader();
      reader.onload = (e) => setPreviews(prev => [...prev, e.target.result]);
      reader.readAsDataURL(f);
    });
  };

  const removePhoto = (i) => {
    setImageFiles(prev => prev.filter((_, idx) => idx !== i));
    setPreviews(prev => prev.filter((_, idx) => idx !== i));
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    addFiles(e.dataTransfer.files);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    if (!title.trim())   { setError("El título es obligatorio");    return; }
    if (!content.trim()) { setError("El contenido es obligatorio"); return; }
    if (!category)       { setError("Selecciona una categoría");    return; }

    try {
      setSaving(true);
      const fd = new FormData();
      fd.append("title",    title);
      fd.append("content",  content);
      fd.append("category", category);
      imageFiles.forEach(f => fd.append("images", f)); // solo la portada

      const res = await fetch(`${API_BASE}/api/posts`, {
        method: "POST",
        headers: { ...authHeaders() },
        body: fd
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.msg || data?.message || `Error ${res.status}`);
        return;
      }

      const newPostId = data.id || data.post?.id;
      navigate("/");
    } catch (err) {
      console.error("Error creando post:", err);
      setError("Error de conexión. Intenta de nuevo.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ background: "#0d1117", minHeight: "100vh", fontFamily: "system-ui, sans-serif" }}>

      {/* HEADER */}
      <div className="text-center text-white" style={{
        background: "linear-gradient(135deg, #0f2027 0%, #203a43 50%, #2c5364 100%)",
        padding: "50px 20px 40px", position: "relative"
      }}>
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "4px",
          background: "linear-gradient(to right, #00f2fe, #4facfe, #f9d423)" }} />
        <p style={{ color: "#f9d423", letterSpacing: "3px", fontSize: "0.7rem",
          textTransform: "uppercase", marginBottom: "8px" }}>
          Comparte tu experiencia
        </p>
        <h1 className="fw-black mb-2" style={{ fontSize: "2.5rem", letterSpacing: "-1px" }}>
          Nueva{" "}
          <span style={{ background: "linear-gradient(135deg, #f9d423 0%, #ff4e50 100%)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            Publicación
          </span>
        </h1>
        <p style={{ color: "rgba(255,255,255,0.6)", fontSize: "0.95rem" }}>
          Cuenta tu historia a la comunidad viajera
        </p>
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "1px",
          background: "linear-gradient(to right, transparent, #00f2fe, transparent)" }} />
      </div>

      {/* FORMULARIO */}
      <div className="container py-5" style={{ maxWidth: "860px" }}>
        <form onSubmit={handleSubmit}>

          {error && (
            <div style={{
              background: "rgba(220,53,69,0.15)", border: "1px solid rgba(220,53,69,0.4)",
              color: "#ff6b7a", borderRadius: "12px", padding: "12px 16px",
              marginBottom: "24px", fontSize: "0.9rem"
            }}>
              ⚠️ {error}
            </div>
          )}

          {/* TÍTULO */}
          <div style={{ marginBottom: "20px" }}>
            <label style={{ color: "rgba(255,255,255,0.7)", fontSize: "0.8rem",
              letterSpacing: "2px", textTransform: "uppercase",
              marginBottom: "8px", display: "block" }}>
              Título *
            </label>
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Dale un título llamativo a tu publicación..."
              style={{
                width: "100%", background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px",
                color: "#fff", padding: "14px 18px", fontSize: "1rem",
                outline: "none", boxSizing: "border-box", transition: "border 0.2s"
              }}
              onFocus={e => e.target.style.border = "1px solid rgba(249,212,35,0.5)"}
              onBlur={e  => e.target.style.border = "1px solid rgba(255,255,255,0.1)"}
            />
          </div>

          {/* CATEGORÍA */}
          <div style={{ marginBottom: "20px" }}>
            <label style={{ color: "rgba(255,255,255,0.7)", fontSize: "0.8rem",
              letterSpacing: "2px", textTransform: "uppercase",
              marginBottom: "10px", display: "block" }}>
              Categoría *
            </label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
              {categories.map(c => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setCategory(c.id)}
                  style={{
                    padding: "8px 18px", borderRadius: "20px", fontSize: "0.82rem",
                    cursor: "pointer", transition: "all 0.2s",
                    background: category === c.id
                      ? "linear-gradient(135deg, #f9d423, #ff4e50)"
                      : "rgba(255,255,255,0.05)",
                    border: category === c.id ? "none" : "1px solid rgba(255,255,255,0.12)",
                    color: category === c.id ? "#000" : "rgba(255,255,255,0.6)",
                    fontWeight: category === c.id ? "700" : "400"
                  }}
                >
                  {c.name}
                </button>
              ))}
            </div>
          </div>

          {/* CONTENIDO */}
          <div style={{ marginBottom: "20px" }}>
            <label style={{ color: "rgba(255,255,255,0.7)", fontSize: "0.8rem",
              letterSpacing: "2px", textTransform: "uppercase",
              marginBottom: "8px", display: "block" }}>
              Contenido *
            </label>
            <textarea
              value={content}
              onChange={e => setContent(e.target.value)}
              rows={7}
              placeholder="Describe tu experiencia, consejos, recomendaciones..."
              style={{
                width: "100%", background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px",
                color: "#fff", padding: "14px 18px", fontSize: "0.95rem",
                outline: "none", resize: "vertical", boxSizing: "border-box",
                lineHeight: "1.6", transition: "border 0.2s"
              }}
              onFocus={e => e.target.style.border = "1px solid rgba(249,212,35,0.5)"}
              onBlur={e  => e.target.style.border = "1px solid rgba(255,255,255,0.1)"}
            />
            <div style={{ textAlign: "right", color: "rgba(255,255,255,0.25)",
              fontSize: "0.75rem", marginTop: "4px" }}>
              {content.length} caracteres
            </div>
          </div>

          {/* FOTOS */}
          <div style={{ marginBottom: "28px" }}>
            <label style={{ color: "rgba(255,255,255,0.7)", fontSize: "0.8rem",
              letterSpacing: "2px", textTransform: "uppercase",
              marginBottom: "8px", display: "block" }}>
              Fotos{" "}
              <span style={{ color: "rgba(255,255,255,0.35)", fontWeight: 400,
                textTransform: "none", letterSpacing: 0 }}>
                ({imageFiles.length}/{MAX_PHOTOS})
              </span>
            </label>

            {imageFiles.length < MAX_PHOTOS && (
              <div
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => document.getElementById("photoInput").click()}
                style={{
                  border: dragOver ? "2px dashed #f9d423" : "2px dashed rgba(255,255,255,0.15)",
                  borderRadius: "16px", padding: "32px 20px",
                  textAlign: "center", cursor: "pointer",
                  background: dragOver ? "rgba(249,212,35,0.05)" : "rgba(255,255,255,0.02)",
                  transition: "all 0.2s", marginBottom: "16px"
                }}
              >
                <div style={{ fontSize: "2.5rem", marginBottom: "8px" }}>📸</div>
                <p style={{ color: "rgba(255,255,255,0.5)", margin: 0, fontSize: "0.9rem" }}>
                  Arrastra fotos aquí o{" "}
                  <span style={{ color: "#f9d423", fontWeight: 600 }}>haz clic para seleccionar</span>
                </p>
                <p style={{ color: "rgba(255,255,255,0.25)", margin: "6px 0 0", fontSize: "0.75rem" }}>
                  Máximo {MAX_PHOTOS} fotos · JPG, PNG, WEBP
                </p>
                <input
                  id="photoInput"
                  type="file"
                  accept="image/*"
                  multiple
                  style={{ display: "none" }}
                  onChange={e => addFiles(e.target.files)}
                />
              </div>
            )}

            {previews.length > 0 && (
              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))",
                gap: "10px"
              }}>
                {previews.map((src, i) => (
                  <div key={i} style={{
                    position: "relative", borderRadius: "10px",
                    overflow: "hidden", aspectRatio: "1"
                  }}>
                    <img src={src} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    <div style={{
                      position: "absolute", top: "6px", left: "6px",
                      background: "rgba(0,0,0,0.6)", color: "#f9d423",
                      fontSize: "0.65rem", padding: "2px 7px",
                      borderRadius: "10px", fontWeight: 700
                    }}>
                      {i + 1}
                    </div>
                    <button
                      type="button"
                      onClick={() => removePhoto(i)}
                      style={{
                        position: "absolute", top: "6px", right: "6px",
                        background: "rgba(220,53,69,0.85)", border: "none",
                        color: "#fff", borderRadius: "50%",
                        width: "22px", height: "22px", cursor: "pointer",
                        fontSize: "12px", display: "flex",
                        alignItems: "center", justifyContent: "center"
                      }}
                    >
                      ✕
                    </button>
                    {i === 0 && (
                      <div style={{
                        position: "absolute", bottom: "6px", left: "6px",
                        background: "rgba(249,212,35,0.9)", color: "#000",
                        fontSize: "0.6rem", padding: "2px 7px",
                        borderRadius: "10px", fontWeight: 700
                      }}>
                        PORTADA
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* BOTONES */}
          <div style={{ display: "flex", gap: "12px" }}>
            <button
              type="submit"
              disabled={saving}
              style={{
                flex: 1, padding: "14px", borderRadius: "30px",
                background: saving
                  ? "rgba(249,212,35,0.4)"
                  : "linear-gradient(135deg, #f9d423 0%, #ff4e50 100%)",
                border: "none", color: "#000", fontWeight: 800,
                fontSize: "0.95rem", cursor: saving ? "not-allowed" : "pointer",
                letterSpacing: "1px", transition: "all 0.3s",
                boxShadow: saving ? "none" : "0 0 20px rgba(249,212,35,0.3)"
              }}
            >
              {saving ? "⏳ Publicando..." : "🚀 Publicar"}
            </button>
            <button
              type="button"
              onClick={() => navigate(-1)}
              disabled={saving}
              style={{
                padding: "14px 28px", borderRadius: "30px",
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.15)",
                color: "rgba(255,255,255,0.6)", fontWeight: 600,
                fontSize: "0.9rem", cursor: saving ? "not-allowed" : "pointer"
              }}
            >
              Cancelar
            </button>
          </div>

        </form>
      </div>

      <style>{`
        body { background: #0d1117 !important; }
        input::placeholder, textarea::placeholder { color: rgba(255,255,255,0.25) !important; }
      `}</style>
    </div>
  );
};

export default NewPost;