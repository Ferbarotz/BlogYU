import React, { useState, useRef, useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import { API_BASE } from "../api/backend";

const Profile = () => {
  const { id } = useParams(); // <-- obtener id del perfil desde URL
  const [user, setUser] = useState(null);
  const [uploadingBg, setUploadingBg] = useState(false);
  const [uploadingProfile, setUploadingProfile] = useState(false);
  const fileInputBgRef = useRef(null);

  const [selectedProfileFile, setSelectedProfileFile] = useState(null);
  const [previewProfilePic, setPreviewProfilePic] = useState(null);
  const [profileShape, setProfileShape] = useState(
    localStorage.getItem("profileShape") || "circle"
  );
  const [social, setSocial] = useState({
    twitter: "",
    instagram: "",
    facebook: "",
    website: ""
  });
  const [saving, setSaving] = useState(false);

  // Normaliza URLs devueltas por la API (convierte rutas internas /api/uploads/... a absolute usando API_BASE)
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

  // Reconsulta el usuario en el servidor para mantener consistencia tras subidas/patch
  const fetchUser = async (userId = id) => {
    if (!userId) return;
    try {
      const res = await fetch(`${API_BASE}/api/users/${userId}/public`);
      if (!res.ok) return;
      const remoteUser = await res.json();

      if (remoteUser.background) remoteUser.background = normalizeUrl(remoteUser.background);
      if (remoteUser.profile_pic) remoteUser.profile_pic = normalizeUrl(remoteUser.profile_pic);
      if (remoteUser.profilePic) remoteUser.profilePic = normalizeUrl(remoteUser.profilePic);

      setUser(remoteUser);
      setProfileShape(remoteUser.profileShape || localStorage.getItem("profileShape") || "circle");
      setSocial({
        twitter: remoteUser.social?.twitter || "",
        instagram: remoteUser.social?.instagram || "",
        facebook: remoteUser.social?.facebook || "",
        website: remoteUser.social?.website || ""
      });
      localStorage.setItem("user", JSON.stringify(remoteUser));
    } catch (err) {
      console.debug("fetchUser error", err);
    }
  };

  useEffect(() => {
    fetchUser(id);
  }, [id]);

  // ---------- Background upload (igual que antes) ----------
  const handleUploadBackground = async (e) => {
    const file = e.target.files[0];
    if (!file || !user?.id) return;
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
        if (data.user) {
          if (data.user.background) data.user.background = normalizeUrl(data.user.background);
          setUser(data.user);
          localStorage.setItem("user", JSON.stringify(data.user));
        } else if (data.background) {
          const merged = { ...(user || {}), background: normalizeUrl(data.background) };
          setUser(merged);
          localStorage.setItem("user", JSON.stringify(merged));
        } else {
          fetchUser();
        }
        alert("Fondo actualizado.");
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

  const handleSelectProfileFile = async (e) => {
    const file = e.target.files[0];
    if (!file || !user?.id) return;
    setSelectedProfileFile(file);
    setPreviewProfilePic(URL.createObjectURL(file));

    setUploadingProfile(true);
    const fd = new FormData();
    fd.append("profile", file);
    const token = localStorage.getItem("token");

    try {
      const res = await fetch(`${API_BASE}/api/users/${user.id}/profile-pic`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: fd,
      });

      let data = null;
      try { data = await res.json(); } catch(e) { data = null; }

      if (res.ok) {
        const newUrl = data?.profile_pic || data?.profilePic || (data?.user && (data.user.profile_pic || data.user.profilePic));
        if (newUrl) {
          const normalized = normalizeUrl(newUrl);
          const merged = { ...(user || {}), profile_pic: normalized, profilePic: normalized };
          setUser(merged);
          localStorage.setItem("user", JSON.stringify(merged));
          setSelectedProfileFile(null);
          setPreviewProfilePic(null);
        } else {
          await fetchUser();
        }
        alert("Foto de perfil actualizada.");
      } else {
        const msg = (data && (data.msg || data.error)) || `Status ${res.status}`;
        alert("Error subiendo avatar: " + msg);
      }
    } catch (err) {
      console.error("Error subiendo avatar:", err);
      alert("Error de red subiendo avatar. Mira la consola.");
    } finally {
      setUploadingProfile(false);
    }
  };

  const persistProfileShapeLocally = (shape) => {
    setProfileShape(shape);
    localStorage.setItem("profileShape", shape);
    const merged = { ...(user || {}), profileShape: shape };
    setUser(merged);
    localStorage.setItem("user", JSON.stringify(merged));
  };

  const handleSaveProfile = async () => {
    if (!user || !user.id) {
      alert("Usuario no encontrado.");
      return;
    }

    setSaving(true);

    try {
      const token = localStorage.getItem("token");

      let updatedUser = { ...(user || {}) };

      if (selectedProfileFile) {
        setUploadingProfile(true);
        const fd = new FormData();

        fd.append("profile", selectedProfileFile);

        let uploadRes;
        try {
          uploadRes = await fetch(`${API_BASE}/api/users/${user.id}/profile-pic`, {
            method: "POST",
            headers: token ? { Authorization: `Bearer ${token}` } : {},
            body: fd,
          });
        } catch (networkErr) {
          console.error("Network error uploading profile pic:", networkErr);
          alert("Error de red subiendo la foto de perfil. Revisa la consola.");
          setUploadingProfile(false);
          setSaving(false);
          return;
        }

        const uploadText = await uploadRes.text();
        console.log("UPLOAD response status:", uploadRes.status, "body:", uploadText);

        let upData = null;
        try { upData = JSON.parse(uploadText); } catch (e) { upData = null; }

        if (uploadRes.ok) {
          const returnedUser = upData?.user;
          const returnedProfilePic = upData?.profile_pic || upData?.profilePic;

          if (returnedUser) {
            if (returnedUser.profile_pic) returnedUser.profile_pic = normalizeUrl(returnedUser.profile_pic);
            if (returnedUser.profilePic) returnedUser.profilePic = normalizeUrl(returnedUser.profilePic);
            updatedUser = { ...updatedUser, ...returnedUser };
          } else if (returnedProfilePic) {
            const normalized = normalizeUrl(returnedProfilePic);
            updatedUser = { ...updatedUser, profile_pic: normalized, profilePic: normalized };
          } else {
            await fetchUser();
            updatedUser = JSON.parse(localStorage.getItem("user") || "null") || updatedUser;
          }
        } else {
          let errMsg = uploadRes.status;
          if (upData && (upData.msg || upData.error)) errMsg = upData.msg || upData.error;
          alert("Error subiendo la foto de perfil: " + errMsg);
          setUploadingProfile(false);
          setSaving(false);
          return;
        }
        setUploadingProfile(false);
      }

      const bodyToSend = {
        profile_shape: profileShape,
        profileShape,
        social: {
          twitter: social.twitter || "",
          instagram: social.instagram || "",
          facebook: social.facebook || "",
          website: social.website || ""
        }
      };

      const patchRes = await fetch(`${API_BASE}/api/users/${user.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify(bodyToSend)
      });

      const patchText = await patchRes.text();
      console.log("PATCH response status:", patchRes.status, "body:", patchText);

      let patchData = null;
      try { patchData = JSON.parse(patchText); } catch (e) { patchData = null; }

      if (patchRes.ok) {
        if (patchData?.user) {
          const ruser = patchData.user;
          if (ruser.background) ruser.background = normalizeUrl(ruser.background);
          if (ruser.profile_pic) ruser.profile_pic = normalizeUrl(ruser.profile_pic);
          if (ruser.profilePic) ruser.profilePic = normalizeUrl(ruser.profilePic);
          updatedUser = { ...updatedUser, ...ruser };
        } else {
          updatedUser = { ...updatedUser, profileShape: profileShape, social: bodyToSend.social };
        }

        if (updatedUser.profilePic) updatedUser.profilePic = normalizeUrl(updatedUser.profilePic);
        if (updatedUser.profile_pic) updatedUser.profile_pic = normalizeUrl(updatedUser.profile_pic);
        if (updatedUser.background) updatedUser.background = normalizeUrl(updatedUser.background);

        setUser(updatedUser);
        localStorage.setItem("user", JSON.stringify(updatedUser));

        setSelectedProfileFile(null);
        setPreviewProfilePic(null);

        await fetchUser();

        alert("Perfil actualizado correctamente.");
      } else {
        const msg = patchData?.msg || patchData?.error || patchText || `Status ${patchRes.status}`;
        console.warn("Error guardando perfil:", msg);
        alert("Error al guardar el perfil: " + msg);
      }
    } catch (err) {
      console.error("Error guardando perfil:", err);
      alert("Error de conexión al guardar el perfil. Revisa la consola y Network para más detalle.");
    } finally {
      setSaving(false);
    }
  };

  const heroBg = user?.background
    ? `linear-gradient(rgba(0,0,0,0.55), rgba(0,0,0,0.55)), url(${normalizeUrl(user.background)})`
    : "linear-gradient(135deg, #0f2027 0%, #203a43 50%, #2c5364 100%)";

  const avatarBorderRadius = profileShape === "circle" ? "50%" : "12px";

  if (!user) return <div style={{ color: "#fff", padding: 20 }}>Cargando perfil...</div>;

  return (
    <div style={{ background: "#0d1117", minHeight: "100vh" }}>
      {/* HERO */}
      <div
        className="text-center text-white"
        style={{
          backgroundImage: heroBg,
          backgroundSize: "cover",
          backgroundPosition: "center",
          minHeight: "320px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          padding: "40px 20px 30px",
          position: "relative"
        }}
      >
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0,
          height: "4px",
          background: "linear-gradient(to right, #00f2fe, #4facfe, #f9d423)"
        }} />

        <div
          style={{
            width: "96px", height: "96px",
            borderRadius: avatarBorderRadius,
            background: previewProfilePic ? `url(${previewProfilePic}) center/cover no-repeat` : (user?.profilePic ? `url(${normalizeUrl(user.profilePic)}) center/cover no-repeat` : (user?.profile_pic ? `url(${normalizeUrl(user.profile_pic)}) center/cover no-repeat` : (user?.background ? `url(${normalizeUrl(user.background)}) center/cover no-repeat` : "linear-gradient(135deg,#00f2fe,#4facfe)"))),
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "2.2rem", fontWeight: "900", color: "#000",
            marginBottom: "12px", boxShadow: "0 0 30px rgba(0,242,254,0.25)", overflow: "hidden"
          }}
          title="Foto de perfil"
        >
          {!previewProfilePic && !user?.profilePic && !user?.profile_pic && !user?.background && (user?.name ? user.name.charAt(0).toUpperCase() : "?")}
        </div>

        <p style={{ color: "#f9d423", letterSpacing: "3px", fontSize: "0.7rem", textTransform: "uppercase", marginBottom: "6px" }}>
          Tu perfil viajero
        </p>
        <h1 className="fw-black mb-2" style={{ fontSize: "2.2rem", letterSpacing: "-1px" }}>
          {user?.name}{" "}
          <span style={{
            background: "linear-gradient(135deg, #00f2fe 0%, #4facfe 100%)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent"
          }}>✈️</span>
        </h1>
        <p style={{ color: "rgba(255,255,255,0.6)", fontSize: "0.95rem", marginBottom: "18px" }}>
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
          className="btn fw-bold rounded-pill"
          style={{
            background: uploadingBg ? "rgba(255,255,255,0.08)" : "linear-gradient(135deg,#f9d423,#ff4e50)",
            border: "none", color: "#000",
            padding: "8px 22px", fontSize: "0.9rem",
            boxShadow: "0 0 12px rgba(249,212,35,0.2)"
          }}
        >
          {uploadingBg ? <><span className="spinner-border spinner-border-sm me-2"></span>Subiendo...</> : "📷 Cambiar imagen de fondo"}
        </button>

        <div style={{
          position: "absolute", bottom: 0, left: 0, right: 0,
          height: "1px", background: "linear-gradient(to right, transparent, #00f2fe, transparent)"
        }} />
      </div>

      {/* CONTENT */}
      <div className="container py-5" style={{ maxWidth: "900px" }}>
        <div className="d-flex align-items-center mb-5">
          <div style={{ height: "2px", flex: 1, background: "linear-gradient(to right, transparent, rgba(0,242,254,0.3))" }} />
          <span className="mx-3 fw-bold text-uppercase" style={{ color: "rgba(255,255,255,0.4)", letterSpacing: "3px", fontSize: "0.75rem" }}>
            Información
          </span>
          <div style={{ height: "2px", flex: 1, background: "linear-gradient(to left, transparent, rgba(0,242,254,0.3))" }} />
        </div>

        <div className="row g-4">
          {/* INFORMACIÓN PERSONAL (formulario) */}
          <div className="col-md-6">
            <div style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: "16px",
              padding: "24px",
              height: "100%"
            }}>
              <h5 className="fw-bold mb-4" style={{ color: "#00f2fe", letterSpacing: "2px", fontSize: "0.8rem", textTransform: "uppercase" }}>
                📋 Información Personal
              </h5>

              <div className="mb-3">
                <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "1.5px", marginBottom: "6px" }}>Nombre</p>
                <p className="fw-bold mb-0" style={{ color: "#fff", fontSize: "1.05rem" }}>{user?.name}</p>
              </div>

              <div className="mb-3">
                <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "1.5px", marginBottom: "6px" }}>Correo Electrónico</p>
                <p className="fw-bold mb-0" style={{ color: "#fff", fontSize: "1.05rem" }}>{user?.email}</p>
              </div>

              <hr style={{ border: "none", height: "1px", background: "rgba(255,255,255,0.04)", margin: "14px 0" }} />

              {/* Upload foto + preview + shape selector */}
              <div className="mb-3">
                <p style={{ color: "rgba(255,255,255,0.6)", marginBottom: "8px" }}>Foto de perfil</p>

                <div style={{ display: "flex", gap: "12px", alignItems: "center", marginBottom: "10px" }}>
                  <div style={{
                    width: "72px", height: "72px", borderRadius: profileShape === "circle" ? "50%" : "12px",
                    background: previewProfilePic ? `url(${previewProfilePic}) center/cover no-repeat` : (user?.profilePic ? `url(${normalizeUrl(user.profilePic)}) center/cover no-repeat` : (user?.profile_pic ? `url(${normalizeUrl(user.profile_pic)}) center/cover no-repeat` : (user?.background ? `url(${normalizeUrl(user.background)}) center/cover no-repeat` : "linear-gradient(135deg,#00f2fe,#4facfe)"))),
                    display: "grid", placeItems: "center", color: "#000", fontWeight: 900, overflow: "hidden", boxShadow: "0 8px 20px rgba(0,0,0,0.6)"
                  }}>
                    {!previewProfilePic && !user?.profilePic && !user?.profile_pic && !user?.background && (user?.name ? user.name.charAt(0).toUpperCase() : "?")}
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    <label className="btn btn-sm" style={{ padding: "6px 10px", borderRadius: "999px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.9)", cursor: "pointer" }}>
                      Seleccionar foto
                      <input type="file" accept="image/*" onChange={(e) => handleSelectProfileFile(e)} style={{ display: "none" }} />
                    </label>

                    <div style={{ display: "flex", gap: "6px" }}>
                      <button
                        onClick={() => persistProfileShapeLocally("circle")}
                        className="btn btn-sm"
                        style={{
                          padding: "6px 10px",
                          borderRadius: "999px",
                          background: profileShape === "circle" ? "linear-gradient(135deg,#00f2fe,#4facfe)" : "rgba(255,255,255,0.03)",
                          color: profileShape === "circle" ? "#000" : "rgba(255,255,255,0.9)",
                          border: profileShape === "circle" ? "none" : "1px solid rgba(255,255,255,0.06)"
                        }}
                      >
                        Circular
                      </button>
                      <button
                        onClick={() => persistProfileShapeLocally("square")}
                        className="btn btn-sm"
                        style={{
                          padding: "6px 10px",
                          borderRadius: "999px",
                          background: profileShape === "square" ? "linear-gradient(135deg,#f9d423,#ff4e50)" : "rgba(255,255,255,0.03)",
                          color: profileShape === "square" ? "#000" : "rgba(255,255,255,0.9)",
                          border: profileShape === "square" ? "none" : "1px solid rgba(255,255,255,0.06)"
                        }}
                      >
                        Cuadrado
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Redes sociales */}
              <div className="mb-3">
                <p style={{ color: "rgba(255,255,255,0.6)", marginBottom: "8px" }}>Redes sociales</p>

                <input
                  placeholder="Twitter (handle o url)"
                  value={social.twitter}
                  onChange={(e) => setSocial(prev => ({ ...prev, twitter: e.target.value }))}
                  className="form-control mb-2"
                  style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", color: "#fff" }}
                />
                <input
                  placeholder="Instagram (handle o url)"
                  value={social.instagram}
                  onChange={(e) => setSocial(prev => ({ ...prev, instagram: e.target.value }))}
                  className="form-control mb-2"
                  style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", color: "#fff" }}
                />
                <input
                  placeholder="Facebook (url)"
                  value={social.facebook}
                  onChange={(e) => setSocial(prev => ({ ...prev, facebook: e.target.value }))}
                  className="form-control mb-2"
                  style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", color: "#fff" }}
                />
                <input
                  placeholder="Sitio web"
                  value={social.website}
                  onChange={(e) => setSocial(prev => ({ ...prev, website: e.target.value }))}
                  className="form-control mb-2"
                  style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", color: "#fff" }}
                />
              </div>

              <div className="d-flex gap-2 mt-3">
                <button
                  onClick={handleSaveProfile}
                  disabled={saving || uploadingProfile}
                  className="btn fw-bold rounded-pill"
                  style={{
                    background: "linear-gradient(135deg,#00f2fe,#4facfe)",
                    color: "#000", border: "none", padding: "8px 18px"
                  }}
                >
                  {saving || uploadingProfile ? <><span className="spinner-border spinner-border-sm me-2"></span>Guardando...</> : "Guardar cambios"}
                </button>

                <Link
                  to="/my-posts"
                  className="btn btn-outline-secondary"
                  style={{ color: "rgba(255,255,255,0.85)", borderRadius: "999px", border: "1px solid rgba(255,255,255,0.06)" }}
                >
                  📝 Ver mis publicaciones
                </Link>
              </div>
            </div>
          </div>

          {/* ESTADÍSTICAS (lado derecho) */}
          <div className="col-md-6">
            <div style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: "16px",
              padding: "24px",
              height: "100%"
            }}>
              <h5 className="fw-bold mb-4" style={{ color: "#f9d423", letterSpacing: "2px", fontSize: "0.8rem", textTransform: "uppercase" }}>
                📊 Estadísticas
              </h5>
              <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.95rem", lineHeight: "1.7" }}>
                Próximamente podrás ver aquí el impacto de tus publicaciones, seguidores y destinos favoritos.
              </p>

              <div style={{ marginTop: "18px" }}>
                <p style={{ color: "rgba(255,255,255,0.6)", marginBottom: "8px" }}>Redes públicas</p>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {social.twitter || social.instagram || social.facebook || social.website ? (
                    <>
                      {social.website ? <a href={social.website} target="_blank" rel="noreferrer" style={{ color: "#00f2fe" }}>{social.website}</a> : null}
                      {social.twitter ? <div style={{ color: "#fff" }}>🐦 {social.twitter}</div> : null}
                      {social.instagram ? <div style={{ color: "#fff" }}>📸 {social.instagram}</div> : null}
                      {social.facebook ? <div style={{ color: "#fff" }}>📘 {social.facebook}</div> : null}
                    </>
                  ) : (
                    <div style={{ color: "rgba(255,255,255,0.4)" }}>No has agregado redes sociales.</div>
                  )}
                </div>
              </div>

              <div className="mt-4 d-flex gap-3 flex-wrap">
                {["Publicaciones", "Seguidores", "Favoritos"].map((stat) => (
                  <div key={stat} style={{
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: "12px",
                    padding: "10px 14px",
                    textAlign: "center",
                    flex: "1",
                    minWidth: "80px"
                  }}>
                    <p className="fw-black mb-1" style={{ color: "#00f2fe", fontSize: "1.2rem" }}>—</p>
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

      <style>{`body { background: #0d1117 !important; }`}</style>
    </div>
  );
};

export default Profile;