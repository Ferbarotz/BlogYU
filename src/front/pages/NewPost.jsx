// src/front/pages/NewPost.jsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { API_BASE, authHeaders } from "../api/backend";
import { compressImage } from "../utils/imageCompression";
import UploadProgress from "../components/UploadProgress";
import { CATEGORIES, mergeCategoryData, getCategoryMeta } from "../utils/categories";

const DEFAULT_CATEGORIES = CATEGORIES;

const MAX_PHOTOS = 10;

const NewPost = () => {
  const navigate = useNavigate();
  const [title, setTitle]           = useState("");
  const [content, setContent]       = useState("");
  const [imageFiles, setImageFiles] = useState([]);
  const [previews, setPreviews]     = useState([]);
  const [category, setCategory]     = useState(DEFAULT_CATEGORIES[0]?.id || "otros");
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);
  const [saving, setSaving]         = useState(false);
  const [error, setError]           = useState(null);
  const [dragOver, setDragOver]     = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  useEffect(() => {
    let mounted = true;
    const fetchCategories = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/categories`);
        if (!res.ok) throw new Error("No categories endpoint");
        const data = await res.json();
        if (!mounted) return;
        if (Array.isArray(data) && data.length > 0) {
          const normalized = mergeCategoryData(data);
          setCategories(normalized);
          setCategory((prev) => prev || normalized[0]?.id || "otros");
        }
      } catch {
        setCategories(DEFAULT_CATEGORIES);
        setCategory(DEFAULT_CATEGORIES[0].id);
      }
    };
    fetchCategories();
    return () => { mounted = false; };
  }, []);

  const addFiles = async (files) => {
    const valid = Array.from(files).filter(f => f.type.startsWith("image/"));
    const remaining = MAX_PHOTOS - imageFiles.length;
    const toAdd = valid.slice(0, remaining);
    if (!toAdd.length) return;

    const compressedFiles = [];
    for (const file of toAdd) {
      const compressed = await compressImage(file);
      compressedFiles.push(compressed);
    }

    setImageFiles(prev => [...prev, ...compressedFiles]);

    compressedFiles.forEach(f => {
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
      setUploadProgress(0);

      const fd = new FormData();
      fd.append("title",    title);
      fd.append("content",  content);
      fd.append("category", category);
      imageFiles.forEach(f => fd.append("images", f));

      await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", `${API_BASE}/api/posts`);
        const headers = authHeaders();
        Object.entries(headers).forEach(([key, value]) => {
          xhr.setRequestHeader(key, value);
        });

        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const percent = Math.round((event.loaded / event.total) * 100);
            setUploadProgress(percent);
          }
        };

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) resolve(xhr.response);
          else reject(new Error(`Error ${xhr.status}: ${xhr.statusText}`));
        };

        xhr.onerror = () => reject(new Error("Error de red"));

        xhr.send(fd);
      });

      navigate("/");
    } catch (err) {
      console.error("Error creando post:", err);
      setError("Error de conexión. Intenta de nuevo.");
    } finally {
      setSaving(false);
      setUploadProgress(0);
    }
  };

  return (
    <div style={{ background: "#0d1117", minHeight: "100vh", fontFamily: "system-ui, sans-serif" }}>

      {/* HEADER - same style as MyPosts */}
      <div className="text-center text-white" style={{
        background: "linear-gradient(135deg, #0f2027 0%, #203a43 50%, #2c5364 100%)",
        padding: "50px 20px 40px", position: "relative"
      }}>
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "4px", background: "linear-gradient(to right, #00f2fe, #4facfe, #f9d423)" }} />
        <p style={{ color: "#f9d423", letterSpacing: "3px", fontSize: "0.7rem", textTransform: "uppercase", marginBottom: "8px" }}>
          Comparte tu experiencia
        </p>
        <h1 className="fw-black mb-2" style={{ fontSize: "2.5rem", letterSpacing: "-1px" }}>
          Nueva{" "}
          <span style={{ background: "linear-gradient(135deg, #00f2fe 0%, #4facfe 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            Publicación
          </span>
        </h1>
        <p style={{ color: "rgba(255,255,255,0.6)", fontSize: "0.95rem" }}>
          Cuenta tu historia a la comunidad viajera
        </p>
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "1px", background: "linear-gradient(to right, transparent, #00f2fe, transparent)" }} />
      </div>

      {/* FORM */}
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
            <label style={{ color: "rgba(255,255,255,0.7)", fontSize: "0.8rem", letterSpacing: "2px", textTransform: "uppercase", marginBottom: "8px", display: "block" }}>
              Título *
            </label>
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Dale un título llamativo a tu publicación..."
              style={{
                width: "100%", background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.06)", borderRadius: "12px",
                color: "#fff", padding: "14px 18px", fontSize: "1rem",
                outline: "none", boxSizing: "border-box", transition: "border 0.2s"
              }}
              onFocus={e => e.target.style.border = "1px solid rgba(0,242,254,0.45)"}
              onBlur={e  => e.target.style.border = "1px solid rgba(255,255,255,0.06)"}
            />
          </div>

          {/* CATEGORÍA - same style as MyPosts */}
          <div style={{ marginBottom: "20px" }}>
            <label style={{ color: "rgba(255,255,255,0.7)", fontSize: "0.8rem", letterSpacing: "2px", textTransform: "uppercase", marginBottom: "10px", display: "block" }}>
              Categoría *
            </label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
              {categories.map((c) => {
                const meta = getCategoryMeta(c.id);
                const isActive = category === c.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setCategory(c.id)}
                    className="d-inline-flex align-items-center gap-2"
                    style={{
                      padding: "9px 14px",
                      borderRadius: "14px",
                      fontSize: "0.82rem",
                      cursor: "pointer",
                      transition: "all 0.2s",
                      background: isActive ? `${meta.color}22` : "rgba(255,255,255,0.03)",
                      border: `1px solid ${isActive ? meta.color : "rgba(255,255,255,0.12)"}`,
                      color: isActive ? "#fff" : "rgba(255,255,255,0.72)",
                      fontWeight: isActive ? "700" : "500",
                      boxShadow: isActive ? `0 6px 18px ${meta.color}55` : "none"
                    }}
                    title={meta.description}
                  >
                    <span
                      style={{
                        width: 24,
                        height: 24,
                        borderRadius: "50%",
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        background: meta.color,
                        color: "#fff",
                        fontSize: "0.75rem"
                      }}
                    >
                      <i className={`bi ${meta.icon}`} />
                    </span>
                    <span>{meta.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* CONTENIDO */}
          <div style={{ marginBottom: "20px" }}>
            <label style={{ color: "rgba(255,255,255,0.7)", fontSize: "0.8rem", letterSpacing: "2px", textTransform: "uppercase", marginBottom: "8px", display: "block" }}>
              Contenido *
            </label>
            <textarea
              value={content}
              onChange={e => setContent(e.target.value)}
              rows={7}
              placeholder="Describe tu experiencia, consejos, recomendaciones..."
              style={{
                width: "100%", background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.06)", borderRadius: "12px",
                color: "#fff", padding: "14px 18px", fontSize: "0.95rem",
                outline: "none", resize: "vertical", boxSizing: "border-box",
                lineHeight: "1.6", transition: "border 0.2s"
              }}
              onFocus={e => e.target.style.border = "1px solid rgba(0,242,254,0.45)"}
              onBlur={e  => e.target.style.border = "1px solid rgba(255,255,255,0.06)"}
            />
            <div style={{ textAlign: "right", color: "rgba(255,255,255,0.25)", fontSize: "0.75rem", marginTop: "4px" }}>
              {content.length} caracteres
            </div>
          </div>

          {/* FOTOS - big dashed area like MyPosts image (no thumbnails initially) */}
          <div style={{ marginBottom: "28px" }}>
            <label style={{ color: "rgba(255,255,255,0.7)", fontSize: "0.8rem", letterSpacing: "2px", textTransform: "uppercase", marginBottom: "8px", display: "block" }}>
              Fotos{" "}
              <span style={{ color: "rgba(255,255,255,0.35)", fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>
                ({imageFiles.length}/{MAX_PHOTOS})
              </span>
            </label>

            {previews.length === 0 ? (
              <div
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => document.getElementById("photoInput").click()}
                style={{
                  border: dragOver ? "2px dashed rgba(249,212,35,0.9)" : "2px dashed rgba(255,255,255,0.12)",
                  borderRadius: "12px",
                  padding: "42px 20px",
                  textAlign: "center",
                  cursor: "pointer",
                  color: "rgba(255,255,255,0.6)",
                  marginBottom: "16px",
                  background: "rgba(255,255,255,0.01)"
                }}
              >
                <div style={{ fontSize: "2.6rem", marginBottom: "10px", color: "rgba(255,255,255,0.8)" }}>📷</div>
                <p style={{ margin: 0, fontSize: "0.95rem", color: "rgba(255,255,255,0.6)" }}>
                  Arrastra fotos aquí o <span style={{ color: "#f9d423", fontWeight: 700 }}>haz clic para seleccionar</span>
                </p>
                <p style={{ color: "rgba(255,255,255,0.28)", marginTop: "8px", fontSize: "0.8rem" }}>
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
            ) : (
              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))",
                gap: "10px",
                marginBottom: "12px"
              }}>
                {previews.map((src, i) => (
                  <div key={i} style={{ position: "relative", borderRadius: "10px", overflow: "hidden", aspectRatio: "1" }}>
                    <img src={src} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    <div style={{
                      position: "absolute", top: "6px", left: "6px",
                      background: "rgba(0,0,0,0.6)", color: "#00f2fe",
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
                        background: "#00f2fe", color: "#00122a",
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

          {saving && <UploadProgress percent={uploadProgress} label="Subiendo imágenes..." />}

          <div style={{ display: "flex", gap: "12px" }}>
            <button
              type="submit"
              disabled={saving}
              className="btn fw-bold rounded-pill"
              style={{
                flex: 1,
                background: "linear-gradient(135deg, #00f2fe 0%, #4facfe 100%)",
                border: "none",
                color: "#000",
                padding: "14px 20px",
                fontSize: "1rem",
                letterSpacing: "1px",
                boxShadow: "0 0 20px rgba(0, 242, 254, 0.25)",
                cursor: saving ? "not-allowed" : "pointer"
              }}
            >
              {saving ? "⏳ Publicando..." : "🚀 Publicar"}
            </button>

            <button
              type="button"
              onClick={() => navigate(-1)}
              disabled={saving}
              style={{
                padding: "12px 22px",
                borderRadius: "30px",
                background: "transparent",
                border: "1px solid rgba(255,255,255,0.08)",
                color: "rgba(255,255,255,0.7)",
                cursor: saving ? "not-allowed" : "pointer"
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