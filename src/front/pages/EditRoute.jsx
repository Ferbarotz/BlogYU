import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { API_BASE, authHeaders } from "../api/backend";

const STEP_TYPES = [
  { id: "vuelo", label: "✈️ Vuelo" },
  { id: "aeropuerto", label: "🛬 Aeropuerto" },
  { id: "hotel", label: "🏨 Hotel" },
  { id: "restaurante", label: "🍽️ Restaurante" },
  { id: "cafe", label: "☕ Café" },
  { id: "lugar", label: "📍 Lugar" },
  { id: "transporte", label: "🚌 Transporte" },
  { id: "vip", label: "⭐ VIP" },
  { id: "otro", label: "✨ Otro" },
];

const MAX_PHOTOS = 5;

const emptyStep = () => ({
  _key: Math.random().toString(36).slice(2),
  type: "lugar",
  title: "",
  description: "",
  rating: 5,
  location: "",
  images: [],      // URLs ya subidas (strings)
  newFiles: [],      // File objects pendientes
  newPreviews: [],      // base64 previews
  dragOver: false,
});

const EditRoute = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ title: "", destination: "", budget: "" });
  const [steps, setSteps] = useState([]);
  const [route, setRoute] = useState(null); // Estado para la ruta completa

  // Estado para almacenar archivos válidos en uploads
  const [validUploads, setValidUploads] = useState(new Set());

  // ── Obtener lista de archivos válidos en uploads ──
  useEffect(() => {
    fetch(`${API_BASE}/api/uploads/list`)
      .then(res => res.json())
      .then(data => {
        if (data.files) {
          setValidUploads(new Set(data.files));
        }
      })
      .catch(console.error);
  }, []);

  // ── Cargar ruta ──
  useEffect(() => {
    const fetchRoute = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/routes/${id}`, { headers: authHeaders() });
        if (res.status === 401) { navigate("/login"); return; }
        if (!res.ok) throw new Error();
        const data = await res.json();

        setRoute(data); // Guardamos la ruta completa

        setForm({
          title: data.title || "",
          destination: data.destination || "",
          budget: data.budget || "",
        });

        setSteps((data.steps || []).map(s => ({
          _key: Math.random().toString(36).slice(2),
          type: s.type || "lugar",
          title: s.title || "",
          description: s.description || "",
          rating: s.rating || 5,
          location: s.location || "",
          images: (() => {
            const raw = s.images || [];
            const urls = raw.map(img => {
              if (!img) return null;
              if (typeof img === "string") return img.trim();
              if (img.url) return String(img.url).trim();
              if (img.src) return String(img.src).trim();
              if (img.path) return String(img.path).trim();
              return null;
            }).filter(Boolean).map(url => {
              if (/^https?:\/\//i.test(url)) return url;
              if (url.startsWith("/")) return `${API_BASE.replace(/\/$/, "")}${url}`;
              return url;
            });
            return [...new Set(urls)];
          })(),
          newFiles: [],
          newPreviews: [],
          dragOver: false,
        })));
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchRoute();
  }, [id, navigate]);

  // ── Filtrar imágenes inválidas cuando cargue la ruta y lista uploads ──
  useEffect(() => {
    if (!loading && validUploads.size > 0) {
      setSteps(prevSteps => prevSteps.map(step => {
        const filteredImages = step.images.filter(url => {
          try {
            const filename = url.split('/').pop();
            return validUploads.has(filename);
          } catch {
            return false;
          }
        });
        return { ...step, images: filteredImages };
      }));
    }
  }, [loading, validUploads]);

  // ── Helpers steps ──
  const updateStep = (idx, patch) =>
    setSteps(prev => prev.map((s, i) => i === idx ? { ...s, ...patch } : s));

  const addStep = () => setSteps(prev => [...prev, emptyStep()]);

  const removeStep = (idx) => setSteps(prev => prev.filter((_, i) => i !== idx));

  const moveStep = (idx, dir) => {
    setSteps(prev => {
      const arr = [...prev];
      const target = idx + dir;
      if (target < 0 || target >= arr.length) return arr;
      [arr[idx], arr[target]] = [arr[target], arr[idx]];
      return arr;
    });
  };

  // ── Fotos por step ──
  const addFiles = (idx, files) => {
    const valid = Array.from(files)
      .filter(f => f.type.startsWith("image/"));

    if (!valid.length) return;

    // Leer todos como base64 primero, luego actualizar estado UNA sola vez
    const promises = valid.map(f => new Promise(resolve => {
      const reader = new FileReader();
      reader.onload = e => resolve({ file: f, preview: e.target.result });
      reader.readAsDataURL(f);
    }));

    Promise.all(promises).then(results => {
      setSteps(prev => prev.map((s, i) => {
        if (i !== idx) return s;
        const remaining = MAX_PHOTOS - s.images.length - s.newFiles.length;
        if (remaining <= 0) return s;
        const toAdd = results.slice(0, remaining);
        return {
          ...s,
          newFiles: [...s.newFiles, ...toAdd.map(r => r.file)],
          newPreviews: [...s.newPreviews, ...toAdd.map(r => r.preview)],
        };
      }));
    });
  };

  const removeExistingImg = (stepIdx, imgIdx) =>
    updateStep(stepIdx, { images: steps[stepIdx].images.filter((_, i) => i !== imgIdx) });

  const removeNewImg = (stepIdx, imgIdx) =>
    updateStep(stepIdx, {
      newFiles: steps[stepIdx].newFiles.filter((_, i) => i !== imgIdx),
      newPreviews: steps[stepIdx].newPreviews.filter((_, i) => i !== imgIdx),
    });

  // ── Subir fotos nuevas al servidor ──
  const uploadStepImages = async (stepFiles) => {
    if (stepFiles.length === 0) return [];
    const urls = [];
    for (const file of stepFiles) {
      const fd = new FormData();
      fd.append("file", file); // campo 'file' para backend
      const res = await fetch(`${API_BASE}/api/upload-step-image`, {
        method: "POST",
        headers: authHeaders(), // objeto completo con Authorization si hay token
        body: fd,
      });
      if (!res.ok) {
        const text = await res.text();
        console.error("Error upload:", text);
        throw new Error("Error uploading images");
      }
      const data = await res.json();
      urls.push(data.url);
    }
    return urls;
  };

  // ── Función para refrescar la ruta tras subir imágenes exitosamente ──
  const handleUploadSuccess = async () => {
    const r = await fetch(`${API_BASE}/api/routes/${id}`, { headers: authHeaders() });
    if (r.ok) {
      const updated = await r.json();
      setRoute(updated);
      // Actualiza feed global si existe
      if (typeof window.refreshFeed === "function") {
        window.refreshFeed();
      }
      // Si tienes setFeed en props o contexto, actualízalo aquí
      // else if (setFeed) {
      //   setFeed(prev => prev.map(it => it.id === updated.id ? ({ ...updated, type: 'route' }) : it));
      // }
    }
  };

  // ── Submit ──
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      // Subir fotos nuevas de cada step
      const stepsPayload = [];
      for (const step of steps) {
        const uploadedUrls = step.newFiles.length
          ? await uploadStepImages(step.newFiles)
          : [];

        stepsPayload.push({
          type: step.type,
          title: step.title,
          description: step.description,
          rating: step.rating,
          location: step.location,
          keep_image_urls: step.images,  // imágenes existentes que se conservan
          new_images: uploadedUrls,      // imágenes nuevas subidas
        });
      }

      const payload = { ...form, steps: stepsPayload };
      console.log("Payload a enviar en update_route:", payload);

      const res = await fetch(`${API_BASE}/api/routes/${id}`, {
        method: "PUT",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        // Refrescar ruta tras guardar cambios
        await handleUploadSuccess();
        navigate("/my-routes");
      } else {
        const text = await res.text();
        alert("Error al guardar los cambios: " + text);
      }
    } catch (err) {
      console.error(err);
      alert("Error de conexión.");
    } finally {
      setSaving(false);
    }
  };

  // ── Estilos ──
  const inputStyle = {
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.1)",
    color: "#fff", borderRadius: "12px",
    padding: "12px 16px", width: "100%",
    fontSize: "0.95rem", outline: "none",
    boxSizing: "border-box", transition: "border 0.2s",
  };
  const labelStyle = {
    color: "rgba(255,255,255,0.6)", fontSize: "0.8rem",
    letterSpacing: "1px", textTransform: "uppercase",
    marginBottom: "6px", display: "block",
  };
  const focusOn = e => e.target.style.border = "1px solid rgba(249,212,35,0.5)";
  const focusOff = e => e.target.style.border = "1px solid rgba(255,255,255,0.1)";

  // ── Loading ──
  if (loading) return (
    <div className="d-flex flex-column align-items-center justify-content-center"
      style={{ minHeight: "60vh", background: "#0d1117" }}>
      <div className="spinner-border mb-3" style={{ color: "#f9d423", width: "3rem", height: "3rem" }} />
      <p style={{ color: "#f9d423", letterSpacing: "3px", fontSize: "0.8rem", textTransform: "uppercase" }}>
        Cargando ruta...
      </p>
    </div>
  );

  return (
    <div style={{ background: "#0d1117", minHeight: "100vh", fontFamily: "system-ui, sans-serif" }}>

      {/* HEADER */}
      <div className="text-center text-white" style={{
        background: "linear-gradient(135deg, #0f2027 0%, #203a43 50%, #2c5364 100%)",
        padding: "50px 20px 40px", position: "relative"
      }}>
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0, height: "4px",
          background: "linear-gradient(to right, #00f2fe, #4facfe, #f9d423)"
        }} />
        <p style={{
          color: "#f9d423", letterSpacing: "3px", fontSize: "0.7rem",
          textTransform: "uppercase", marginBottom: "8px"
        }}>
          Tu espacio viajero
        </p>
        <h1 className="fw-black mb-2" style={{ fontSize: "2.5rem", letterSpacing: "-1px" }}>
          Editar{" "}
          <span style={{
            background: "linear-gradient(135deg, #f9d423 0%, #ff4e50 100%)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent"
          }}>
            Ruta
          </span>
        </h1>
        <p style={{ color: "rgba(255,255,255,0.6)", fontSize: "0.95rem" }}>
          Modifica los detalles y pasos de tu aventura
        </p>
        <div style={{
          position: "absolute", bottom: 0, left: 0, right: 0, height: "1px",
          background: "linear-gradient(to right, transparent, #f9d423, transparent)"
        }} />
      </div>

      <div className="container py-5" style={{ maxWidth: "860px" }}>

        {/* Botón volver */}
        <button onClick={() => navigate(-1)} style={{
          background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.15)",
          color: "rgba(255,255,255,0.7)", borderRadius: "20px", padding: "8px 20px",
          cursor: "pointer", marginBottom: "24px", fontSize: "0.85rem"
        }}>
          ← Volver
        </button>

        <form onSubmit={handleSubmit}>

          {/* ── INFO GENERAL ── */}
          <div style={{
            background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: "20px", padding: "32px", marginBottom: "24px"
          }}>
            <h5 style={{ color: "#f9d423", marginBottom: "24px", fontWeight: 700 }}>
              🗺️ Información general
            </h5>

            <div className="mb-4">
              <label style={labelStyle}>📝 Título *</label>
              <input type="text" value={form.title} required style={inputStyle}
                onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                onFocus={focusOn} onBlur={focusOff}
                placeholder="Ej: Aventura por los Alpes" />
            </div>

            <div className="mb-4">
              <label style={labelStyle}>📍 Destino *</label>
              <input type="text" value={form.destination} required style={inputStyle}
                onChange={e => setForm(p => ({ ...p, destination: e.target.value }))}
                onFocus={focusOn} onBlur={focusOff}
                placeholder="Ej: Suiza, Europa" />
            </div>

            <div className="mb-4">
              <label style={labelStyle}>💰 Presupuesto</label>
              <input type="text" value={form.budget} style={inputStyle}
                onChange={e => setForm(p => ({ ...p, budget: e.target.value }))}
                onFocus={focusOn} onBlur={focusOff}
                placeholder="Ej: 1500€" />
            </div>
          </div>

          {/* ── SEPARADOR ── */}
          <div className="d-flex align-items-center mb-4">
            <div style={{ height: "2px", flex: 1, background: "linear-gradient(to right, transparent, rgba(249,212,35,0.3))" }} />
            <span className="mx-3 fw-bold text-uppercase" style={{ color: "rgba(255,255,255,0.4)", letterSpacing: "3px", fontSize: "0.75rem" }}>
              Itinerario
            </span>
            <div style={{ height: "2px", flex: 1, background: "linear-gradient(to left, transparent, rgba(249,212,35,0.3))" }} />
          </div>

          {/* ── STEPS ── */}
          <div style={{ marginBottom: "24px" }}>
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h5 style={{ color: "#f9d423", fontWeight: 700, margin: 0 }}>
                🧭 Pasos de la ruta
                <span style={{ 
                  marginLeft: "12px", 
                  fontSize: "0.75rem", 
                  color: "rgba(255,255,255,0.4)",
                  background: "rgba(249,212,35,0.1)",
                  padding: "4px 12px",
                  borderRadius: "12px",
                  fontWeight: 400
                }}>
                  {steps.length} {steps.length === 1 ? "paso" : "pasos"}
                </span>
              </h5>
              <button 
                type="button" 
                onClick={addStep} 
                style={{
                  background: "linear-gradient(135deg, #f9d423, #ff4e50)",
                  border: "none", 
                  color: "#000", 
                  borderRadius: "20px",
                  padding: "10px 24px", 
                  fontWeight: 700, 
                  cursor: "pointer", 
                  fontSize: "0.85rem",
                  boxShadow: "0 4px 12px rgba(249,212,35,0.3)",
                  transition: "all 0.2s ease"
                }}
                onMouseOver={e => e.currentTarget.style.transform = "translateY(-2px)"}
                onMouseOut={e => e.currentTarget.style.transform = "translateY(0)"}
              >
                + Añadir paso
              </button>
            </div>

            {steps.length === 0 && (
              <div style={{
                textAlign: "center", 
                padding: "60px 40px",
                background: "rgba(255,255,255,0.02)", 
                border: "2px dashed rgba(249,212,35,0.2)",
                borderRadius: "20px", 
                color: "rgba(255,255,255,0.3)"
              }}>
                <div style={{ fontSize: "3rem", marginBottom: "16px", opacity: 0.5 }}>🗺️</div>
                <p style={{ fontSize: "1.1rem", color: "rgba(255,255,255,0.5)", marginBottom: "8px" }}>
                  Tu itinerario está vacío
                </p>
                <p style={{ fontSize: "0.9rem", color: "rgba(255,255,255,0.3)", marginBottom: 0 }}>
                  Haz clic en "<span style={{ color: "#f9d423" }}>+ Añadir paso</span>" para crear tu primera parada
                </p>
              </div>
            )}

            {steps.map((step, idx) => {
              const totalPhotos = step.images.length + step.newFiles.length;
              const stepTypeLabel = STEP_TYPES.find(t => t.id === step.type)?.label || "✨ Otro";
              
              return (
                <div key={step._key} style={{
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(249,212,35,0.1)",
                  borderRadius: "20px", 
                  padding: "28px", 
                  marginBottom: "20px",
                  position: "relative",
                  boxShadow: "0 4px 20px rgba(0,0,0,0.2)"
                }}>
                  {/* Número de paso decorativo */}
                  <div style={{
                    position: "absolute",
                    top: "-12px",
                    left: "24px",
                    background: "linear-gradient(135deg, #f9d423, #ff4e50)",
                    color: "#000",
                    fontWeight: 800,
                    fontSize: "0.75rem",
                    padding: "6px 16px",
                    borderRadius: "12px",
                    boxShadow: "0 4px 12px rgba(249,212,35,0.4)"
                  }}>
                    {stepTypeLabel} • PASO {idx + 1}
                  </div>

                  {/* Step header */}
                  <div className="d-flex justify-content-between align-items-center mb-3" style={{ marginTop: "8px" }}>
                    <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                      {totalPhotos > 0 && (
                        <span style={{ 
                          fontSize: "0.75rem", 
                          color: "rgba(255,255,255,0.5)",
                          background: "rgba(255,255,255,0.05)",
                          padding: "4px 10px",
                          borderRadius: "8px"
                        }}>
                          📸 {totalPhotos}
                        </span>
                      )}
                    </div>
                    <div style={{ display: "flex", gap: "8px" }}>
                      <button type="button" onClick={() => moveStep(idx, -1)}
                        disabled={idx === 0}
                        style={{
                          background: "rgba(255,255,255,0.05)", 
                          border: "1px solid rgba(255,255,255,0.1)",
                          color: "#fff", 
                          borderRadius: "10px", 
                          padding: "6px 12px",
                          cursor: idx === 0 ? "not-allowed" : "pointer", 
                          opacity: idx === 0 ? 0.3 : 1,
                          fontSize: "0.85rem",
                          fontWeight: 600
                        }}>
                        ↑
                      </button>
                      <button type="button" onClick={() => moveStep(idx, 1)}
                        disabled={idx === steps.length - 1}
                        style={{
                          background: "rgba(255,255,255,0.05)", 
                          border: "1px solid rgba(255,255,255,0.1)",
                          color: "#fff", 
                          borderRadius: "10px", 
                          padding: "6px 12px",
                          cursor: idx === steps.length - 1 ? "not-allowed" : "pointer",
                          opacity: idx === steps.length - 1 ? 0.3 : 1,
                          fontSize: "0.85rem",
                          fontWeight: 600
                        }}>
                        ↓
                      </button>
                      <button type="button" onClick={() => removeStep(idx)}
                        style={{
                          background: "rgba(220,53,69,0.15)", 
                          border: "1px solid rgba(220,53,69,0.3)",
                          color: "#ff4e50", 
                          borderRadius: "10px", 
                          padding: "6px 12px", 
                          cursor: "pointer",
                          fontSize: "0.85rem",
                          fontWeight: 600
                        }}>
                        🗑️
                      </button>
                    </div>
                  </div>

                  {/* Tipo */}
                  <div className="mb-3">
                    <label style={labelStyle}>Tipo</label>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                      {STEP_TYPES.map(t => (
                        <button key={t.id} type="button"
                          onClick={() => updateStep(idx, { type: t.id })}
                          style={{
                            padding: "6px 14px", borderRadius: "20px", fontSize: "0.78rem",
                            cursor: "pointer",
                            background: step.type === t.id
                              ? "linear-gradient(135deg, #f9d423, #ff4e50)"
                              : "rgba(255,255,255,0.05)",
                            border: step.type === t.id ? "none" : "1px solid rgba(255,255,255,0.1)",
                            color: step.type === t.id ? "#000" : "rgba(255,255,255,0.6)",
                            fontWeight: step.type === t.id ? 700 : 400,
                          }}>
                          {t.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Título */}
                  <div className="mb-3">
                    <label style={labelStyle}>Título *</label>
                    <input type="text" value={step.title} required
                      onChange={e => updateStep(idx, { title: e.target.value })}
                      style={inputStyle} onFocus={focusOn} onBlur={focusOff}
                      placeholder="Nombre del lugar o actividad" />
                  </div>

                  {/* Descripción + Ubicación */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }} className="mb-3">
                    <div>
                      <label style={labelStyle}>Descripción</label>
                      <textarea rows={3} value={step.description}
                        onChange={e => updateStep(idx, { description: e.target.value })}
                        style={{ ...inputStyle, resize: "vertical" }}
                        onFocus={focusOn} onBlur={focusOff}
                        placeholder="Detalles del paso..." />
                    </div>
                    <div>
                      <label style={labelStyle}>Ubicación</label>
                      <input type="text" value={step.location}
                        onChange={e => updateStep(idx, { location: e.target.value })}
                        style={inputStyle} onFocus={focusOn} onBlur={focusOff}
                        placeholder="Ej: París, Francia" />
                      <label style={{ ...labelStyle, marginTop: "16px" }}>
                        ⭐ Rating: {step.rating}/5
                      </label>
                      <input type="range" min={1} max={5} value={step.rating}
                        onChange={e => updateStep(idx, { rating: Number(e.target.value) })}
                        style={{ width: "100%", accentColor: "#f9d423" }} />
                    </div>
                  </div>

                  {/* Fotos del step */}
                  <div>
                    <label style={labelStyle}>
                      📸 Fotos{" "}
                      <span style={{
                        color: totalPhotos >= MAX_PHOTOS ? "#ff4e50" : "rgba(255,255,255,0.3)",
                        fontWeight: 400, textTransform: "none", letterSpacing: 0
                      }}>
                        ({totalPhotos}/{MAX_PHOTOS})
                      </span>
                    </label>

                    {/* Fotos existentes */}
                    {step.images.length > 0 && (
                      <div style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fill, minmax(90px, 1fr))",
                        gap: "8px", marginBottom: "12px"
                      }}>
                        {step.images.map((url, imgIdx) => (
                          <div key={imgIdx} style={{
                            position: "relative", borderRadius: "10px",
                            overflow: "hidden", aspectRatio: "1",
                            border: imgIdx === 0 ? "2px solid rgba(249,212,35,0.6)" : "2px solid transparent"
                          }}>
                            <img src={url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                            {imgIdx === 0 && (
                              <div style={{
                                position: "absolute", bottom: "4px", left: "4px",
                                background: "rgba(249,212,35,0.9)", color: "#000",
                                fontSize: "0.55rem", padding: "2px 6px", borderRadius: "8px", fontWeight: 700
                              }}>
                                PORTADA
                              </div>
                            )}
                            <button type="button" onClick={() => removeExistingImg(idx, imgIdx)}
                              style={{
                                position: "absolute", top: "4px", right: "4px",
                                background: "rgba(220,53,69,0.85)", border: "none", color: "#fff",
                                borderRadius: "50%", width: "20px", height: "20px", cursor: "pointer",
                                fontSize: "10px", display: "flex", alignItems: "center", justifyContent: "center"
                              }}>
                              ✕
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Drop zone */}
                    {totalPhotos < MAX_PHOTOS && (
                      <div
                        onDragOver={e => { e.preventDefault(); updateStep(idx, { dragOver: true }); }}
                        onDragLeave={() => updateStep(idx, { dragOver: false })}
                        onDrop={e => { e.preventDefault(); updateStep(idx, { dragOver: false }); addFiles(idx, e.dataTransfer.files); }}
                        onClick={() => document.getElementById(`stepPhoto_${idx}`).click()}
                        style={{
                          border: step.dragOver ? "2px dashed #f9d423" : "2px dashed rgba(255,255,255,0.12)",
                          borderRadius: "12px", padding: "16px", textAlign: "center",
                          cursor: "pointer", background: step.dragOver ? "rgba(249,212,35,0.05)" : "transparent",
                          transition: "all 0.2s", marginBottom: "10px"
                        }}>
                        <p style={{ color: "rgba(255,255,255,0.4)", margin: 0, fontSize: "0.8rem" }}>
                          📸 Arrastra o{" "}
                          <span style={{ color: "#f9d423" }}>haz clic</span> para añadir fotos
                        </p>
                        <input id={`stepPhoto_${idx}`} type="file" accept="image/*" multiple
                          style={{ display: "none" }} onChange={e => addFiles(idx, e.target.files)} />
                      </div>
                    )}

                    {/* Previews nuevas */}
                    {step.newPreviews.length > 0 && (
                      <div style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fill, minmax(90px, 1fr))", gap: "8px"
                      }}>
                        {step.newPreviews.map((src, imgIdx) => (
                          <div key={imgIdx} style={{
                            position: "relative", borderRadius: "10px",
                            overflow: "hidden", aspectRatio: "1",
                            border: "2px solid rgba(0,242,254,0.4)"
                          }}>
                            <img src={src} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                            <div style={{
                              position: "absolute", top: "4px", left: "4px",
                              background: "rgba(0,242,254,0.85)", color: "#000",
                              fontSize: "0.55rem", padding: "2px 6px", borderRadius: "8px", fontWeight: 700
                            }}>
                              NUEVA
                            </div>
                            <button type="button" onClick={() => removeNewImg(idx, imgIdx)}
                              style={{
                                position: "absolute", top: "4px", right: "4px",
                                background: "rgba(220,53,69,0.85)", border: "none", color: "#fff",
                                borderRadius: "50%", width: "20px", height: "20px", cursor: "pointer",
                                fontSize: "10px", display: "flex", alignItems: "center", justifyContent: "center"
                              }}>
                              ✕
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* ── BOTONES ── */}
          <div className="d-flex gap-3">
            <button type="button" onClick={() => navigate("/my-routes")} disabled={saving}
              className="btn rounded-pill fw-bold flex-grow-1"
              style={{
                background: "transparent", border: "1px solid rgba(255,255,255,0.2)",
                color: "rgba(255,255,255,0.7)", padding: "14px"
              }}>
              ← Cancelar
            </button>
            <button type="submit" disabled={saving}
              className="btn fw-bold rounded-pill flex-grow-1"
              style={{
                background: saving ? "rgba(249,212,35,0.4)" : "linear-gradient(135deg, #f9d423 0%, #ff4e50 100%)",
                border: "none", color: "#000", padding: "14px",
                boxShadow: "0 0 20px rgba(249,212,35,0.3)",
                cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1
              }}>
              {saving ? "⏳ Guardando..." : "💾 Guardar Cambios"}
            </button>
          </div>

        </form>
      </div>

      <style>{`
        body { background: #0d1117 !important; }
        input::placeholder, textarea::placeholder { color: rgba(255,255,255,0.25) !important; }
        input[type="date"]::-webkit-calendar-picker-indicator { filter: invert(1); }
      `}</style>
    </div>
  );
};

export default EditRoute;