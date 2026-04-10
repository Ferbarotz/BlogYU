// src/front/pages/EditPost.jsx
import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { API_BASE, authHeaders } from "../api/backend";

const CATEGORIES = [
  { id: "hoteles",      name: "Hoteles" },
  { id: "restaurantes", name: "Restaurantes" },
  { id: "bares",        name: "Bares" },
  { id: "lugares",      name: "Lugares / Sitios" },
  { id: "cultura",      name: "Cultura / Museos" },
  { id: "otros",        name: "Otros" }
];

const MAX_PHOTOS = 10;

const EditPost = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [formData, setFormData]             = useState({ title: "", content: "", category: "" });
  const [existingImages, setExistingImages] = useState([]); // { id, url }
  const [newFiles, setNewFiles]             = useState([]);
  const [newPreviews, setNewPreviews]       = useState([]);
  const [loading, setLoading]               = useState(true);
  const [saving, setSaving]                 = useState(false);
  const [dragOver, setDragOver]             = useState(false);
  const [error, setError]                   = useState("");

  useEffect(() => {
    const fetchPost = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/posts/${id}`);
        if (!res.ok) { navigate("/my-posts"); return; }
        const data = await res.json();

        setFormData({
          title:    data.title    || "",
          content:  data.content  || "",
          category: data.category || "otros"
        });

        if (data.images && data.images.length > 0) {
          setExistingImages(
            data.images
              .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
              .map(img => ({
                id:  img.id,
                url: img.url.startsWith("http") ? img.url : `${API_BASE}${img.url}`
              }))
          );
        } else if (data.image) {
          const url = data.image.startsWith("http") ? data.image : `${API_BASE}${data.image}`;
          setExistingImages([{ id: null, url }]);
        }
      } catch (err) {
        console.error(err);
        setError("Error cargando el post");
      } finally {
        setLoading(false);
      }
    };
    fetchPost();
  }, [id, navigate]);

  const totalPhotos = existingImages.length + newFiles.length;

  const addFiles = (files) => {
    const remaining = MAX_PHOTOS - totalPhotos;
    const valid = Array.from(files).filter(f => f.type.startsWith("image/")).slice(0, remaining);
    if (!valid.length) return;
    setNewFiles(prev => [...prev, ...valid]);
    valid.forEach(f => {
      const reader = new FileReader();
      reader.onload = e => setNewPreviews(prev => [...prev, e.target.result]);
      reader.readAsDataURL(f);
    });
  };

  const removeExisting = (i) => setExistingImages(prev => prev.filter((_, idx) => idx !== i));

  const removeNew = (i) => {
    setNewFiles(prev    => prev.filter((_, idx) => idx !== i));
    setNewPreviews(prev => prev.filter((_, idx) => idx !== i));
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    addFiles(e.dataTransfer.files);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.content.trim()) {
      setError("Título y contenido son obligatorios");
      return;
    }
    setSaving(true);
    setError("");

    try {
      const fd = new FormData();
      fd.append("title",    formData.title);
      fd.append("content",  formData.content);
      fd.append("category", formData.category);

      // ✅ IDs de imágenes existentes que el usuario quiere CONSERVAR
      const keepIds = existingImages
        .filter(img => img.id !== null)
        .map(img => img.id);
      fd.append("keep_image_ids", JSON.stringify(keepIds));

      // ✅ Nuevas fotos a agregar
      newFiles.forEach(f => fd.append("images", f));

      const res = await fetch(`${API_BASE}/api/posts/${id}`, {
        method: "PUT",
        headers: { ...authHeaders() }, // sin Content-Type para que el browser ponga el boundary
        body: fd
      });

      if (res.ok) {
        navigate("/my-posts");
      } else {
        const errData = await res.json().catch(() => ({}));
        setError(errData.msg || "Error al guardar los cambios");
      }
    } catch (err) {
      console.error(err);
      setError("Error de conexión");
    } finally {
      setSaving(false);
    }
  };

  // ── Estilos reutilizables ──────────────────────────────────────────────────
  const labelStyle = {
    color: "rgba(255,255,255,0.7)", fontSize: "0.8rem",
    letterSpacing: "2px", textTransform: "uppercase",
    marginBottom: "8px", display: "block"
  };
  const inputStyle = {
    width: "100%", background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px",
    color: "#fff", padding: "12px 16px", outline: "none", boxSizing: "border-box"
  };

  if (loading) return (
    <div style={{ background: "#0d1117", minHeight: "100vh", display: "flex",
      alignItems: "center", justifyContent: "center" }}>
      <div className="spinner-border" style={{ color: "#f9d423" }} />
    </div>
  );

  return (
    <div style={{ background: "#0d1117", minHeight: "100vh", fontFamily: "system-ui, sans-serif" }}>

      {/* HEADER */}
      <div className="text-center text-white" style={{
        background: "linear-gradient(135deg, #0f2027 0%, #203a43 50%, #2c5364 100%)",
        padding: "40px 20px 30px", position: "relative"
      }}>
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "4px",
          background: "linear-gradient(to right, #00f2fe, #4facfe, #f9d423)" }} />
        <h1 className="fw-black mb-1" style={{ fontSize: "2rem" }}>
          Editar{" "}
          <span style={{ background: "linear-gradient(135deg, #f9d423 0%, #ff4e50 100%)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            Publicación
          </span>
        </h1>
      </div>

      <div className="container py-5" style={{ maxWidth: "860px" }}>

        <button onClick={() => navigate(-1)} style={{
          background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.15)",
          color: "rgba(255,255,255,0.7)", borderRadius: "8px", padding: "8px 16px",
          cursor: "pointer", marginBottom: "24px"
        }}>
          ← Volver
        </button>

        <form onSubmit={handleSubmit} style={{
          background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: "16px", padding: "32px"
        }}>

          {/* TÍTULO */}
          <div style={{ marginBottom: "20px" }}>
            <label style={labelStyle}>Título *</label>
            <input
              value={formData.title}
              onChange={e => setFormData({ ...formData, title: e.target.value })}
              required
              style={inputStyle}
              onFocus={e => e.target.style.border = "1px solid rgba(249,212,35,0.5)"}
              onBlur={e  => e.target.style.border = "1px solid rgba(255,255,255,0.1)"}
            />
          </div>

          {/* CATEGORÍA */}
          <div style={{ marginBottom: "20px" }}>
            <label style={labelStyle}>Categoría *</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
              {CATEGORIES.map(c => (
                <button key={c.id} type="button"
                  onClick={() => setFormData({ ...formData, category: c.id })}
                  style={{
                    padding: "8px 18px", borderRadius: "20px", fontSize: "0.82rem", cursor: "pointer",
                    background: formData.category === c.id
                      ? "linear-gradient(135deg, #f9d423, #ff4e50)"
                      : "rgba(255,255,255,0.05)",
                    border: formData.category === c.id ? "none" : "1px solid rgba(255,255,255,0.12)",
                    color: formData.category === c.id ? "#000" : "rgba(255,255,255,0.6)",
                    fontWeight: formData.category === c.id ? "700" : "400"
                  }}>
                  {c.name}
                </button>
              ))}
            </div>
          </div>

          {/* CONTENIDO */}
          <div style={{ marginBottom: "20px" }}>
            <label style={labelStyle}>Contenido *</label>
            <textarea
              rows={7}
              value={formData.content}
              onChange={e => setFormData({ ...formData, content: e.target.value })}
              required
              style={{ ...inputStyle, resize: "vertical", lineHeight: "1.6" }}
              onFocus={e => e.target.style.border = "1px solid rgba(249,212,35,0.5)"}
              onBlur={e  => e.target.style.border = "1px solid rgba(255,255,255,0.1)"}
            />
            <div style={{ textAlign: "right", color: "rgba(255,255,255,0.25)",
              fontSize: "0.75rem", marginTop: "4px" }}>
              {formData.content.length} caracteres
            </div>
          </div>

          {/* FOTOS */}
          <div style={{ marginBottom: "28px" }}>
            <label style={labelStyle}>
              Fotos{" "}
              <span style={{ color: "rgba(255,255,255,0.35)", fontWeight: 400,
                textTransform: "none", letterSpacing: 0 }}>
                ({totalPhotos}/{MAX_PHOTOS})
              </span>
            </label>

            {/* Fotos existentes */}
            {existingImages.length > 0 && (
              <>
                <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.75rem", marginBottom: "8px" }}>
                  Fotos actuales:
                </p>
                <div style={{ display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(110px, 1fr))",
                  gap: "10px", marginBottom: "16px" }}>
                  {existingImages.map((img, i) => (
                    <div key={img.id ?? i} style={{ position: "relative", borderRadius: "10px",
                      overflow: "hidden", aspectRatio: "1" }}>
                      <img src={img.url} alt=""
                        style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      {i === 0 && (
                        <div style={{ position: "absolute", bottom: "6px", left: "6px",
                          background: "rgba(249,212,35,0.9)", color: "#000",
                          fontSize: "0.6rem", padding: "2px 7px", borderRadius: "10px", fontWeight: 700 }}>
                          PORTADA
                        </div>
                      )}
                      <button type="button" onClick={() => removeExisting(i)}
                        style={{ position: "absolute", top: "6px", right: "6px",
                          background: "rgba(220,53,69,0.85)", border: "none", color: "#fff",
                          borderRadius: "50%", width: "22px", height: "22px", cursor: "pointer",
                          fontSize: "12px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* Drop zone — solo si hay espacio */}
            {totalPhotos < MAX_PHOTOS && (
              <div
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => document.getElementById("editPhotoInput").click()}
                style={{
                  border: dragOver ? "2px dashed #f9d423" : "2px dashed rgba(255,255,255,0.15)",
                  borderRadius: "16px", padding: "24px 20px", textAlign: "center",
                  cursor: "pointer",
                  background: dragOver ? "rgba(249,212,35,0.05)" : "rgba(255,255,255,0.02)",
                  transition: "all 0.2s", marginBottom: "16px"
                }}>
                <div style={{ fontSize: "2rem", marginBottom: "6px" }}>📸</div>
                <p style={{ color: "rgba(255,255,255,0.5)", margin: 0, fontSize: "0.85rem" }}>
                  Arrastra fotos nuevas o{" "}
                  <span style={{ color: "#f9d423", fontWeight: 600 }}>haz clic para seleccionar</span>
                </p>
                <p style={{ color: "rgba(255,255,255,0.25)", margin: "6px 0 0", fontSize: "0.75rem" }}>
                  Máximo {MAX_PHOTOS} fotos · JPG, PNG, WEBP
                </p>
                <input id="editPhotoInput" type="file" accept="image/*" multiple
                  style={{ display: "none" }}
                  onChange={e => addFiles(e.target.files)} />
              </div>
            )}

            {/* Previews nuevas fotos */}
            {newPreviews.length > 0 && (
              <>
                <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.75rem", marginBottom: "8px" }}>
                  Fotos nuevas a subir:
                </p>
                <div style={{ display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(110px, 1fr))", gap: "10px" }}>
                  {newPreviews.map((src, i) => (
                    <div key={i} style={{ position: "relative", borderRadius: "10px",
                      overflow: "hidden", aspectRatio: "1" }}>
                      <img src={src} alt=""
                        style={{ width: "100%", height: "100%", objectFit: "cover",
                          border: "2px solid rgba(0,242,254,0.4)", borderRadius: "10px" }} />
                      <button type="button" onClick={() => removeNew(i)}
                        style={{ position: "absolute", top: "6px", right: "6px",
                          background: "rgba(220,53,69,0.85)", border: "none", color: "#fff",
                          borderRadius: "50%", width: "22px", height: "22px", cursor: "pointer",
                          fontSize: "12px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* ERROR */}
          {error && (
            <div style={{ background: "rgba(220,53,69,0.15)", border: "1px solid rgba(220,53,69,0.4)",
              borderRadius: "10px", padding: "12px 16px", color: "#ff6b7a",
              marginBottom: "20px", fontSize: "0.88rem" }}>
              ⚠️ {error}
            </div>
          )}

          {/* BOTONES */}
          <div style={{ display: "flex", gap: "12px" }}>
            <button type="submit" disabled={saving} style={{
              flex: 1, padding: "14px", borderRadius: "30px",
              background: saving
                ? "rgba(249,212,35,0.4)"
                : "linear-gradient(135deg, #f9d423 0%, #ff4e50 100%)",
              border: "none", color: "#000", fontWeight: 800, fontSize: "0.95rem",
              cursor: saving ? "not-allowed" : "pointer"
            }}>
              {saving ? "⏳ Guardando..." : "💾 Guardar Cambios"}
            </button>
            <button type="button" onClick={() => navigate("/my-posts")} disabled={saving}
              style={{ padding: "14px 28px", borderRadius: "30px",
                background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.15)",
                color: "rgba(255,255,255,0.6)", fontWeight: 600, fontSize: "0.9rem",
                cursor: saving ? "not-allowed" : "pointer" }}>
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

export default EditPost;