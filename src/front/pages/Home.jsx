// src/front/pages/Home.jsx
import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import PostCard from "../components/PostCard";
import RouteCard from "../components/RouteCard";
import { API_BASE } from "../api/backend";


const CATEGORIES = [
  { id: "todos", name: "🌍 Todos" },
  { id: "hoteles", name: "🏨 Hoteles" },
  { id: "restaurantes", name: "🍽️ Restaurantes" },
  { id: "bares", name: "🍹 Bares" },
  { id: "lugares", name: "📍 Lugares" },
  { id: "cultura", name: "🎭 Cultura" },
];

const Home = () => {
  const [feed, setFeed] = useState([]);
  const [filteredFeed, setFilteredFeed] = useState([]);
  const [activeCategory, setActiveCategory] = useState("todos");
  const [loading, setLoading] = useState(true);

  // admin/site background
  const [globalHomeBg, setGlobalHomeBg] = useState(null);
  const [adminEditing, setAdminEditing] = useState(false);
  const [previewBg, setPreviewBg] = useState(null);
  const [uploadingBg, setUploadingBg] = useState(false);
  const fileInputRef = useRef(null);
  const urlInputRef = useRef(null);

  const navigate = useNavigate();
  const location = useLocation();

  const token = localStorage.getItem("token");
  const user = JSON.parse(localStorage.getItem("user") || "null");

  

  // Normaliza URLs (resuelve relativas con API_BASE o window.location.origin)
  const normalizeUrl = (url) => {
    if (!url) return null;
    try {
      if (/^https?:\/\//i.test(url)) return url;
      if (url.startsWith("/")) {
        const base = (API_BASE && API_BASE !== "") ? API_BASE.replace(/\/$/, "") : window.location.origin;
        return `${base}${url}`;
      }
      const parsed = new URL(url, window.location.origin);
      return parsed.href;
    } catch (err) {
      return url;
    }
  };

  // ---------------- Hooks (todos antes de cualquier return) ----------------

  // Fetch feed
  console.log("Home montado — API_BASE:", API_BASE);
  useEffect(() => {
    Promise.all([
      fetch(`${API_BASE}/api/posts`).then(r => (r.ok ? r.json() : [])),
      fetch(`${API_BASE}/api/routes`).then(r => (r.ok ? r.json() : []))
    ]).then(([postsData, routesData]) => {
      const combined = [
        ...(Array.isArray(postsData) ? postsData : []).map(p => ({ ...p, type: "post" })),
        ...(Array.isArray(routesData) ? routesData : []).map(r => ({ ...r, type: "route" }))
      ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      setFeed(combined);
      setLoading(false);
    }).catch((err) => {
      console.error("Error fetching feed:", err);
      setLoading(false);
    });
  }, []);

  // Cargar home background (robusto)
  useEffect(() => {
    const cached = localStorage.getItem("globalHomeBg");
    if (cached) {
      setGlobalHomeBg(cached);
    }

    const FETCH_HOME_BG_URLS = [
      `${API_BASE}/api/settings/home-background`,
      `${API_BASE}/api/home-background`,
      `${API_BASE}/api/settings/site/home_background`,
      `${API_BASE}/api/public/home-background`,
    ];

    let cancelled = false;

    (async () => {
      for (const url of FETCH_HOME_BG_URLS) {
        try {
          const res = await fetch(url);
          if (!res.ok) continue;
          const data = await res.json();
          const bg = data?.background || data?.home_background || data?.value || data?.url || data;
          if (bg) {
            const resolved = typeof bg === "string" ? bg : (bg.url || null);
            if (!cancelled && resolved) {
              setGlobalHomeBg(resolved);
              try { localStorage.setItem("globalHomeBg", resolved); } catch (e) { /* ignore */ }
            }
            break;
          }
        } catch (err) {
          console.warn("[Home] error fetching bg desde", url, err);
        }
      }
    })();

    return () => { cancelled = true; };
  }, []);

  // Exponer función para forzar refresh (útil para consola)
  useEffect(() => {
    window.refreshGlobalHomeBg = async function () {
      const urls = [
        `${API_BASE}/api/settings/home-background`,
        `${API_BASE}/api/home-background`,
        `${API_BASE}/api/settings/site/home_background`,
        `${API_BASE}/api/public/home-background`,
      ];
      for (const url of urls) {
        try {
          const res = await fetch(url);
          if (!res.ok) continue;
          const data = await res.json();
          const bg = data?.background || data?.home_background || data?.value || data?.url || data;
          if (bg) {
            const resolved = typeof bg === "string" ? bg : (bg.url || null);
            if (resolved) {
              setGlobalHomeBg(resolved);
              try { localStorage.setItem("globalHomeBg", resolved); } catch (e) { }
              return resolved;
            }
          }
        } catch (e) {
          console.warn("[Home.refresh] error", e);
        }
      }
      return null;
    };
  }, []);

  // Categoría desde URL
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const categoryParam = params.get("category");
    setActiveCategory(categoryParam ? categoryParam.toLowerCase() : "todos");
  }, [location.search]);

  // Filtro
  useEffect(() => {
    if (activeCategory === "todos") {
      setFilteredFeed(feed);
    } else {
      setFilteredFeed(feed.filter(item => {
        if (item.type === "route") return false;
        const cat = item.category ? item.category.toString().toLowerCase() : "";
        return cat === activeCategory;
      }));
    }
  }, [activeCategory, feed]);

  // Aplicar fondo al body para visitantes no autenticados
  useEffect(() => {
    try {
      const publicFallback = "/admin-bg.jpg";
      if (!token && (globalHomeBg || publicFallback)) {
        const bgUrl = normalizeUrl(globalHomeBg || publicFallback);
        document.body.style.backgroundImage = `url(${bgUrl})`;
        document.body.style.backgroundSize = "cover";
        document.body.style.backgroundPosition = "center";
        document.body.style.backgroundRepeat = "no-repeat";
        document.body.style.backgroundAttachment = "fixed";
        document.body.style.backgroundColor = "#071017";
      } else {
        document.body.style.backgroundImage = "";
        document.body.style.backgroundColor = "#0d1117";
      }
    } catch (e) {
      console.warn("No se pudo aplicar background al body:", e);
    }
  }, [token, globalHomeBg]);

  // Limpieza final: restaurar body background cuando componente desmonta
  useEffect(() => {
    return () => {
      try { document.body.style.backgroundImage = ""; document.body.style.backgroundColor = ""; } catch (e) { }
    };
  }, []);

  // Cerrar modal con Esc si está abierto
  useEffect(() => {
    if (!adminEditing) return;
    const onKey = (e) => {
      if (e.key === "Escape") {
        handleCancelEdit();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adminEditing]);

  // ---------------- Fin hooks ----------------

  if (loading) return (
    <div className="d-flex flex-column align-items-center justify-content-center" style={{ minHeight: "60vh", background: "#0d1117" }}>
      <div className="spinner-border mb-3" style={{ color: "#00f2fe", width: "3rem", height: "3rem" }}></div>
      <p style={{ color: "#00f2fe", letterSpacing: "3px", fontSize: "0.8rem", textTransform: "uppercase" }}>
        Cargando destinos...
      </p>
    </div>
  );

  // ---------------- Lógica de selección de fondo ----------------
  const chosenBgUrl = previewBg || (token ? (user?.background || globalHomeBg) : globalHomeBg);
  const heroBgUrl = chosenBgUrl ? normalizeUrl(chosenBgUrl) : null;
  const heroBackground = heroBgUrl
    ? `linear-gradient(rgba(0,0,0,0.55), rgba(0,0,0,0.55)), url(${heroBgUrl})`
    : "linear-gradient(135deg, #0f2027 0%, #203a43 50%, #2c5364 100%)";

  const isAdmin = !!(user && (user.role === "admin" || user.is_admin || user.role === "superuser"));

  // ---------------- Admin handlers ----------------
  const handleSelectFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPreviewBg(URL.createObjectURL(file));
    fileInputRef.current._selectedFile = file;
  };

  const handleSetPreviewFromUrl = () => {
    const url = (urlInputRef.current.value || "").trim();
    if (!url) return alert("Introduce una URL válida.");
    setPreviewBg(url);
    fileInputRef.current._selectedFile = null;
  };

  const applyBodyBackground = (bg) => {
    try {
      const bgUrl = normalizeUrl(bg);
      document.body.style.backgroundImage = `url(${bgUrl})`;
      document.body.style.backgroundSize = "cover";
      document.body.style.backgroundPosition = "center";
      document.body.style.backgroundRepeat = "no-repeat";
      document.body.style.backgroundAttachment = "fixed";
      document.body.style.backgroundColor = "#071017";
    } catch (e) {
      console.warn("Error aplicando background al body:", e);
    }
  };

  const handleUploadHomeBackground = async () => {
    if (!isAdmin) return alert("Solo administradores pueden cambiar el fondo.");
    const selectedFile = fileInputRef.current._selectedFile;
    const imageUrl = (urlInputRef.current.value || "").trim();
    if (!selectedFile && !imageUrl) return alert("Selecciona archivo o pega URL.");

    setUploadingBg(true);
    try {
      const tokenLocal = localStorage.getItem("token");
      if (selectedFile) {
        const fd = new FormData();
        fd.append("background", selectedFile);
        // AJUSTE: He cambiado la ruta para que apunte a settings/home_background
        const uploadRes = await fetch(`${API_BASE}/api/admin/settings/home_background`, {
          method: "POST",
          headers: tokenLocal ? { Authorization: `Bearer ${tokenLocal}` } : {},
          body: fd
        });
        const txt = await uploadRes.text();
        let data = null; try { data = JSON.parse(txt); } catch (e) { data = null; }
        if (!uploadRes.ok) {
          alert("Error subiendo imagen: " + (data?.msg || txt || uploadRes.status));
          setUploadingBg(false);
          return;
        }
        const newBg = data?.background || data?.url || txt;
        setGlobalHomeBg(newBg);
        try { localStorage.setItem("globalHomeBg", newBg); } catch (e) { }
        // Mostrar cambio inmediatamente (preview + aplicar body)
        setPreviewBg(newBg);
        applyBodyBackground(newBg);
        // Limpiar selección local
        fileInputRef.current._selectedFile = null;
        setAdminEditing(false);
        if (window.refreshGlobalHomeBg) window.refreshGlobalHomeBg();
        alert("Fondo del Home actualizado.");
      } else {
        const setRes = await fetch(`${API_BASE}/api/admin/settings/home_background`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(tokenLocal ? { Authorization: `Bearer ${tokenLocal}` } : {})
          },
          body: JSON.stringify({ background: imageUrl })
        });
        const txt = await setRes.text();
        let data = null; try { data = JSON.parse(txt); } catch (e) { data = null; }
        if (!setRes.ok) {
          alert("Error guardando la URL: " + (data?.msg || txt || setRes.status));
          setUploadingBg(false);
          return;
        }
        const newBg = data?.background || imageUrl;
        setGlobalHomeBg(newBg);
        try { localStorage.setItem("globalHomeBg", newBg); } catch (e) { }
        // Mostrar cambio inmediatamente
        setPreviewBg(newBg);
        applyBodyBackground(newBg);
        urlInputRef.current && (urlInputRef.current.value = "");
        setAdminEditing(false);
        if (window.refreshGlobalHomeBg) window.refreshGlobalHomeBg();
        alert("Fondo del Home actualizado (URL).");
      }
    } catch (err) {
      console.error("Error guardando home background:", err);
      alert("Error de conexión al guardar el fondo.");
    } finally {
      setUploadingBg(false);
    }
  };

  const handleCancelEdit = () => {
    setPreviewBg(null);
    if (fileInputRef.current) fileInputRef.current._selectedFile = null;
    if (urlInputRef.current) urlInputRef.current.value = "";
    setAdminEditing(false);
  };

  // ---------------- Render ----------------
  return (
    <div style={{ background: "#0d1117", minHeight: "100vh" }}>
      <div
        className="text-center text-white"
        style={{
          backgroundImage: heroBackground,
          backgroundSize: "cover",
          backgroundPosition: "center",
          minHeight: "380px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          padding: "40px 20px",
          position: "relative",
          transition: "all 0.5s ease",
        }}
      >
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "4px", background: "linear-gradient(to right, #00f2fe, #4facfe, #f9d423)" }} />

        {isAdmin && (
          <button
            onClick={() => setAdminEditing(true)}
            className="btn btn-sm"
            style={{
              position: "absolute",
              top: 18,
              right: 18,
              zIndex: 40,
              background: "rgba(0,0,0,0.45)",
              border: "1px solid rgba(255,255,255,0.06)",
              color: "#00f2fe",
              padding: "6px 10px",
              borderRadius: "999px",
              backdropFilter: "blur(6px)"
            }}
            title="Editar fondo del Home"
          >
            ✏️ Editar fondo del sitio
          </button>
        )}

        {token && user ? (
          <>
            <p style={{ color: "#00f2fe", letterSpacing: "3px", fontSize: "0.7rem", textTransform: "uppercase", marginBottom: "8px" }}>
              Bienvenido de vuelta
            </p>
            <h1 className="fw-black" style={{ fontSize: "2.5rem", letterSpacing: "-1px" }}>
              ¡Hola, {user.name}! 👋
            </h1>
            <p className="mb-4" style={{ color: "rgba(255,255,255,0.7)", maxWidth: "450px", fontSize: "1rem" }}>
              Qué bueno verte de nuevo. ¿Qué hacemos hoy?
            </p>
            <div className="d-flex gap-3 flex-wrap justify-content-center mt-2">
              <button onClick={() => navigate("/new-post")} className="btn fw-bold rounded-pill shadow-lg" style={{ background: "linear-gradient(135deg, #00f2fe 0%, #4facfe 100%)", border: "none", color: "#000", padding: "10px 30px" }}>✍️ Crear publicación</button>
              <button onClick={() => navigate("/create-route")} className="btn fw-bold rounded-pill shadow-lg" style={{ background: "linear-gradient(135deg, #f9d423 0%, #ff4e50 100%)", border: "none", color: "#000", padding: "10px 30px" }}>🗺️ Crear ruta</button>
            </div>
          </>
        ) : (
          <>
            <p style={{ color: "#f9d423", letterSpacing: "3px", fontSize: "0.7rem", textTransform: "uppercase", marginBottom: "8px" }}>
              Comunidad Viajera
            </p>
            <h1 className="fw-black" style={{ fontSize: "2.8rem", letterSpacing: "-1.5px" }}>
              Explora{" "}
              <span style={{ background: "linear-gradient(135deg, #00f2fe 0%, #4facfe 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                BlogYU
              </span>
            </h1>
            <p className="mb-4" style={{ color: "rgba(255,255,255,0.65)", maxWidth: "450px", fontSize: "0.95rem" }}>
              Encuentra los mejores sitios recomendados por la comunidad viajera.
            </p>
            <button onClick={() => navigate("/register")} className="btn fw-bold rounded-pill shadow-lg mt-2" style={{ background: "linear-gradient(135deg, #f9d423 0%, #ff4e50 100%)", border: "none", color: "#000", padding: "10px 30px" }}>
              ¡Únete a la comunidad!
            </button>
          </>
        )}

        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "1px", background: "linear-gradient(to right, transparent, #00f2fe, transparent)" }} />
      </div>

      {/* Admin modal */}
      {adminEditing && (
        // overlay cierra si haces click fuera del contenido
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 1200, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
          onClick={handleCancelEdit}
        >
          <div
            style={{ width: "100%", maxWidth: 920, background: "#0b0e12", borderRadius: 12, padding: 18, border: "1px solid rgba(255,255,255,0.04)" }}
            onClick={(e) => e.stopPropagation() /* evitar cierre al click dentro del modal */}
          >
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h5 style={{ margin: 0, color: "#fff" }}>Editar fondo del Home (solo admin)</h5>
              <div>
                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  {/* Botón Cancelar */}
                  <button
                    className="btn btn-sm"
                    onClick={handleCancelEdit}
                    style={{
                      minWidth: 110,
                      padding: "6px 12px",
                      background: "linear-gradient(135deg, #f9d423 0%, #ff4e50 100%)",
                      color: "#000",
                      fontWeight: "700",
                      border: "none",
                      borderRadius: 6,
                      boxShadow: "0 2px 6px rgba(255,78,80,0.25)",
                      cursor: "pointer",
                      transition: "transform 0.2s ease",
                    }}
                    onMouseEnter={e => e.currentTarget.style.transform = "translateY(-1px)"}
                    onMouseLeave={e => e.currentTarget.style.transform = "translateY(0)"}
                  >
                    Cancelar
                  </button>

                  {/* Botón Guardar */}
                  <button
                    className="btn btn-sm"
                    disabled={uploadingBg}
                    onClick={handleUploadHomeBackground}
                    style={{
                      minWidth: 110,
                      padding: "6px 12px",
                      background: "linear-gradient(135deg,#00f2fe,#4facfe)",
                      color: "#000",
                      fontWeight: "700",
                      border: "none",
                      borderRadius: 6,
                      boxShadow: "0 2px 6px rgba(0,242,254,0.15)",
                      cursor: uploadingBg ? "not-allowed" : "pointer",
                      transition: "transform 0.2s ease",
                    }}
                    onMouseEnter={e => e.currentTarget.style.transform = "translateY(-1px)"}
                    onMouseLeave={e => e.currentTarget.style.transform = "translateY(0)"}
                  >
                    {uploadingBg ? "Guardando..." : "Guardar"}
                  </button>
                </div>

              </div>
            </div>

            <div className="row g-3">
              <div className="col-md-6">
                <p style={{ color: "rgba(255,255,255,0.7)" }}>Subir imagen</p>
                <label className="btn btn-outline-secondary w-100 mb-2">
                  Seleccionar archivo
                  <input type="file" accept="image/*" onChange={handleSelectFile} style={{ display: "none" }} ref={fileInputRef} />
                </label>
                <small style={{ color: "rgba(255,255,255,0.45)" }}>O pega una URL abajo.</small>
              </div>

              <div className="col-md-6">
                <p style={{ color: "rgba(255,255,255,0.7)" }}>Pegar URL de imagen</p>
                <div className="d-flex gap-2">
                  <input ref={urlInputRef} className="form-control" placeholder="https://..." />
                  <button className="btn btn-secondary" onClick={handleSetPreviewFromUrl}>Previsualizar</button>
                </div>
              </div>

              <div className="col-12">
                <p style={{ color: "rgba(255,255,255,0.7)" }}>Previsualización</p>
                <div style={{ height: 180, borderRadius: 8, overflow: "hidden", border: "1px solid rgba(255,255,255,0.04)", background: previewBg ? `url(${previewBg}) center/cover no-repeat` : (globalHomeBg ? `url(${normalizeUrl(globalHomeBg)}) center/cover no-repeat` : "linear-gradient(135deg,#0f2027,#203a43)") }} />
                <small style={{ color: "rgba(255,255,255,0.45)" }}>Previsualización local — haz click en Guardar para aplicar el cambio globalmente.</small>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Contenido principal */}
      <div className="container py-5" style={{ maxWidth: "1200px" }}>
        <div className="d-flex justify-content-center flex-wrap gap-2 mb-5">
          {CATEGORIES.map((cat) => (
            <button key={cat.id} onClick={() => cat.id === "todos" ? navigate("/") : navigate(`/?category=${cat.id}`)} className="btn rounded-pill px-4 fw-bold"
              style={activeCategory === cat.id ? { background: "linear-gradient(135deg, #00f2fe 0%, #4facfe 100%)", border: "none", color: "#000" } : { background: "transparent", border: "1px solid rgba(255,255,255,0.2)", color: "rgba(255,255,255,0.7)" }}>
              {cat.name}
            </button>
          ))}
        </div>

        <div className="d-flex align-items-center mb-4">
          <div style={{ height: "2px", flex: 1, background: "linear-gradient(to right, transparent, rgba(0,242,254,0.3))" }} />
          <span className="mx-3 fw-bold text-uppercase" style={{ color: "rgba(255,255,255,0.4)", letterSpacing: "3px", fontSize: "0.75rem" }}>
            {activeCategory === "todos" ? "Todos los destinos" : `Destinos · ${activeCategory}`}
          </span>
          <div style={{ height: "2px", flex: 1, background: "linear-gradient(to left, transparent, rgba(0,242,254,0.3))" }} />
        </div>

        <div className="row row-cols-1 row-cols-md-2 row-cols-lg-4 g-4">
          {filteredFeed.length === 0 ? (
            <div className="col-12 text-center py-5">
              <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "1.1rem" }}>No hay publicaciones en "{activeCategory}" todavía.</p>
            </div>
          ) : (
            filteredFeed.map((item) => (
              <div className="col" key={`${item.type}-${item.id}`}>
                {item.type === "post" ? (
                  <PostCard post={item} onView={() => navigate(`/posts/${item.id}`)} />
                ) : (
                  <RouteCard route={item} onView={() => navigate(`/route/${item.id}`)} />
                )}
              </div>
            ))
          )}
        </div>
      </div>

      <style>{`body { background-color: #0d1117 !important; }`}</style>
    </div>
  );
};

export default Home;