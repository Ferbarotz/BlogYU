import React, { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { API_BASE } from "../api/backend";

const Profile = () => {
  const [user, setUser] = useState(JSON.parse(localStorage.getItem("user") || "null"));
  const [uploadingBg, setUploadingBg] = useState(false);
  const [uploadingProfile, setUploadingProfile] = useState(false);
  const fileInputBgRef = useRef(null);
  const fileInputProfileRef = useRef(null);
  const [previewProfilePic, setPreviewProfilePic] = useState(null);

  useEffect(() => {
    const handleStorage = () => {
      setUser(JSON.parse(localStorage.getItem("user") || "null"));
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  const normalizeUrl = (url) => {
    if (!url) return null;
    try {
      if (url.startsWith("/")) return `${API_BASE.replace(/\/$/, "")}${url}`;
      const parsed = new URL(url);
      if (parsed.hostname === "127.0.0.1" || parsed.hostname === "localhost") {
        const path = `${parsed.pathname}${parsed.search || ""}${parsed.hash || ""}`;
        return `${API_BASE.replace(/\/$/, "")}${path}`;
      }
      return url;
    } catch (err) {
      return url;
    }
  };

  const handleUploadBackground = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append("background", file);
    setUploadingBg(true);
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_BASE}/api/users/${user.id}/background`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });
      if (response.ok) {
        const data = await response.json();
        if (data.user && data.user.background) {
          data.user.background = normalizeUrl(data.user.background);
        }
        setUser(data.user);
        localStorage.setItem("user", JSON.stringify(data.user));
      } else {
        const errorData = await response.json().catch(() => ({}));
        alert("Error: " + (errorData.msg || "No se pudo subir la imagen"));
      }
    } catch (error) {
      console.error("Error:", error);
      alert("Error de conexión con el servidor");
    } finally {
      setUploadingBg(false);
    }
  };

  const handleUploadProfilePic = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setPreviewProfilePic(URL.createObjectURL(file));
    const formData = new FormData();
    formData.append("profilePic", file);
    setUploadingProfile(true);
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_BASE}/api/users/${user.id}/profile-pic`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });
      if (response.ok) {
        const data = await response.json();
        if (data.user && data.user.profilePic) {
          data.user.profilePic = normalizeUrl(data.user.profilePic);
        }
        setUser(data.user);
        localStorage.setItem("user", JSON.stringify(data.user));
        setPreviewProfilePic(null);
      } else {
        const errorData = await response.json().catch(() => ({}));
        alert("Error: " + (errorData.msg || "No se pudo subir la foto de perfil"));
      }
    } catch (error) {
      console.error("Error:", error);
      alert("Error de conexión con el servidor");
    } finally {
      setUploadingProfile(false);
    }
  };

  const heroBg = user?.background
    ? `linear-gradient(rgba(0,0,0,0.55), rgba(0,0,0,0.55)), url(${normalizeUrl(user.background)})`
    : "linear-gradient(135deg, #0f2027 0%, #203a43 50%, #2c5364 100%)";

  return (
    <div style={{ background: "#0d1117", minHeight: "100vh" }}>

      {/* ── HERO ── */}
      <div
        className="text-center text-white"
        style={{
          backgroundImage: heroBg,
          backgroundSize: "cover",
          backgroundPosition: "center",
          minHeight: "380px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          padding: "50px 20px 40px",
          position: "relative",
          transition: "all 0.5s ease",
        }}
      >
        {/* Línea decorativa superior */}
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0,
          height: "4px",
          background: "linear-gradient(to right, #00f2fe, #4facfe, #f9d423)"
        }} />

        {/* Avatar con foto o inicial */}
        <div
          style={{
            width: "80px", height: "80px", borderRadius: "50%",
            background: previewProfilePic || user?.profilePic
              ? `url(${previewProfilePic || normalizeUrl(user.profilePic)}) center/cover no-repeat`
              : "linear-gradient(135deg, #00f2fe 0%, #4facfe 100%)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "2rem", fontWeight: "900", color: "#000",
            marginBottom: "16px",
            boxShadow: "0 0 25px rgba(0, 242, 254, 0.4)",
            cursor: "pointer",
            border: previewProfilePic || user?.profilePic ? "none" : "2px solid #00f2fe",
          }}
          onClick={() => fileInputProfileRef.current.click()}
          title="Cambiar foto de perfil"
        >
          {!previewProfilePic && !user?.profilePic && (user?.name ? user.name.charAt(0).toUpperCase() : "?")}
        </div>

        <input
          type="file"
          ref={fileInputProfileRef}
          onChange={handleUploadProfilePic}
          style={{ display: "none" }}
          accept="image/*"
        />

        <p style={{ color: "#f9d423", letterSpacing: "3px", fontSize: "0.7rem", textTransform: "uppercase", marginBottom: "6px" }}>
          Tu perfil viajero
        </p>
        <h1 className="fw-black mb-2" style={{ fontSize: "2.5rem", letterSpacing: "-1px" }}>
          {user?.name}{" "}
          <span style={{
            background: "linear-gradient(135deg, #00f2fe 0%, #4facfe 100%)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent"
          }}>
            ✈️
          </span>
        </h1>
        <p style={{ color: "rgba(255,255,255,0.6)", fontSize: "0.95rem", marginBottom: "24px" }}>
          {user?.email}
        </p>

        <input
          type="file"
          ref={fileInputBgRef}
          onChange={handleUploadBackground}
          style={{ display: "none" }}
          accept="image/*"
        />
        <button
          onClick={() => fileInputBgRef.current.click()}
          disabled={uploadingBg}
          className="btn fw-bold rounded-pill shadow-lg"
          style={{
            background: uploadingBg
              ? "rgba(255,255,255,0.1)"
              : "linear-gradient(135deg, #f9d423 0%, #ff4e50 100%)",
            border: "none", color: "#000",
            padding: "10px 30px", fontSize: "0.9rem",
            letterSpacing: "1px",
            boxShadow: "0 0 20px rgba(249, 212, 35, 0.3)",
            transition: "all 0.3s ease"
          }}
          onMouseOver={(e) => !uploadingBg && (e.currentTarget.style.transform = "scale(1.05)")}
          onMouseOut={(e) => e.currentTarget.style.transform = "scale(1)"}
        >
          {uploadingBg ? (
            <><span className="spinner-border spinner-border-sm me-2"></span>Subiendo...</>
          ) : (
            "📷 Cambiar imagen de fondo"
          )}
        </button>

        {/* Línea decorativa inferior */}
        <div style={{
          position: "absolute", bottom: 0, left: 0, right: 0,
          height: "1px",
          background: "linear-gradient(to right, transparent, #00f2fe, transparent)"
        }} />
      </div>

      {/* ── CONTENIDO ── */}
      <div className="container py-5" style={{ maxWidth: "900px" }}>

        {/* SEPARADOR */}
        <div className="d-flex align-items-center mb-5">
          <div style={{ height: "2px", flex: 1, background: "linear-gradient(to right, transparent, rgba(0,242,254,0.3))" }} />
          <span className="mx-3 fw-bold text-uppercase" style={{ color: "rgba(255,255,255,0.4)", letterSpacing: "3px", fontSize: "0.75rem" }}>
            Información
          </span>
          <div style={{ height: "2px", flex: 1, background: "linear-gradient(to left, transparent, rgba(0,242,254,0.3))" }} />
        </div>

        <div className="row g-4">

          {/* DATOS PERSONALES */}
          <div className="col-md-6">
            <div style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: "16px",
              padding: "32px",
              height: "100%"
            }}>
              <h5 className="fw-bold mb-4" style={{ color: "#00f2fe", letterSpacing: "2px", fontSize: "0.8rem", textTransform: "uppercase" }}>
                📋 Información Personal
              </h5>

              <div className="mb-4">
                <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "2px", marginBottom: "4px" }}>
                  Nombre
                </p>
                <p className="fw-bold mb-0" style={{ color: "#fff", fontSize: "1.1rem" }}>
                  {user?.name}
                </p>
              </div>

              <div className="mb-4">
                <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "2px", marginBottom: "4px" }}>
                  Correo Electrónico
                </p>
                <p className="fw-bold mb-0" style={{ color: "#fff", fontSize: "1.1rem" }}>
                  {user?.email}
                </p>
              </div>

              <Link
                to="/my-posts"
                className="btn fw-bold rounded-pill mt-2"
                style={{
                  background: "linear-gradient(135deg, #00f2fe 0%, #4facfe 100%)",
                  border: "none", color: "#000",
                  padding: "10px 28px", fontSize: "0.85rem",
                  letterSpacing: "1px",
                  boxShadow: "0 0 15px rgba(0, 242, 254, 0.3)",
                  transition: "all 0.3s ease"
                }}
                onMouseOver={(e) => e.currentTarget.style.transform = "scale(1.05)"}
                onMouseOut={(e) => e.currentTarget.style.transform = "scale(1)"}
              >
                📝 Ver mis publicaciones
              </Link>
            </div>
          </div>

          {/* ESTADÍSTICAS */}
          <div className="col-md-6">
            <div style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: "16px",
              padding: "32px",
              height: "100%"
            }}>
              <h5 className="fw-bold mb-4" style={{ color: "#f9d423", letterSpacing: "2px", fontSize: "0.8rem", textTransform: "uppercase" }}>
                📊 Estadísticas
              </h5>
              <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.95rem", lineHeight: "1.7" }}>
                Próximamente podrás ver aquí el impacto de tus publicaciones, seguidores y destinos favoritos.
              </p>
              <div className="mt-4 d-flex gap-3 flex-wrap">
                {["Publicaciones", "Seguidores", "Favoritos"].map((stat) => (
                  <div key={stat} style={{
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: "12px",
                    padding: "16px 20px",
                    textAlign: "center",
                    flex: "1",
                    minWidth: "80px"
                  }}>
                    <p className="fw-black mb-1" style={{ color: "#00f2fe", fontSize: "1.5rem" }}>—</p>
                    <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "1px", marginBottom: 0 }}>
                      {stat}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>
      </div>

      <style>{`
        body { background: #0d1117 !important; }
      `}</style>
    </div>
  );
};

export default Profile;