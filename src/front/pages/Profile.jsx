import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { API_BASE } from "../api/backend";

// ── Helper: sesión expirada ──
const handleExpiredSession = (navigate) => {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  alert("Tu sesión ha expirado. Por favor inicia sesión nuevamente.");
  if (navigate) navigate("/login");
  else window.location.href = "/login";
};

// ── Helper: guardar user en localStorage preservando is_admin y role ──
const saveUserToStorage = (newUserData) => {
  const current = (() => {
    try { return JSON.parse(localStorage.getItem("user") || "null"); } catch { return null; }
  })();
  const merged = {
    ...newUserData,
    is_admin: newUserData.is_admin ?? current?.is_admin ?? false,
    role: newUserData.role ?? current?.role ?? "user",
  };
  localStorage.setItem("user", JSON.stringify(merged));
  return merged;
};

// ── Iconos SVG de redes sociales ──
const IconInstagram = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5" stroke="url(#ig)" strokeWidth="2"/>
    <circle cx="12" cy="12" r="4" stroke="url(#ig)" strokeWidth="2"/>
    <circle cx="17.5" cy="6.5" r="1" fill="#E1306C"/>
    <defs>
      <linearGradient id="ig" x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
        <stop stopColor="#f9d423"/><stop offset="0.5" stopColor="#E1306C"/><stop offset="1" stopColor="#833AB4"/>
      </linearGradient>
    </defs>
  </svg>
);
const IconTikTok = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
    <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.18 8.18 0 004.78 1.52V6.76a4.85 4.85 0 01-1.01-.07z"/>
  </svg>
);
const IconFacebook = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="#1877F2">
    <path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.41c0-3.025 1.792-4.697 4.533-4.697 1.312 0 2.686.236 2.686.236v2.97h-1.513c-1.491 0-1.956.93-1.956 1.886v2.267h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z"/>
  </svg>
);
const IconTwitterX = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.737-8.835L1.254 2.25H8.08l4.253 5.622 5.911-5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
  </svg>
);
const IconWebsite = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#00f2fe" strokeWidth="2">
    <circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/>
    <path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/>
  </svg>
);

const buildSocialUrl = (platform, value) => {
  if (!value) return null;
  if (/^https?:\/\//i.test(value)) return value;
  const handles = {
    instagram: `https://instagram.com/${value.replace(/^@/, "")}`,
    tiktok: `https://tiktok.com/@${value.replace(/^@/, "")}`,
    twitter: `https://x.com/${value.replace(/^@/, "")}`,
    facebook: `https://facebook.com/${value}`,
    website: `https://${value}`
  };
  return handles[platform] || value;
};

const SocialChip = ({ platform, value, icon, color, label }) => {
  const url = buildSocialUrl(platform, value);
  if (!value) return null;
  return (
    <a href={url} target="_blank" rel="noreferrer"
      style={{
        display: "inline-flex", alignItems: "center", gap: "8px",
        padding: "7px 14px", borderRadius: "999px",
        background: "rgba(255,255,255,0.04)", border: `1px solid ${color}40`,
        color: "#fff", textDecoration: "none", fontSize: "0.82rem", fontWeight: 600,
        transition: "all 0.2s ease"
      }}
      onMouseOver={(e) => { e.currentTarget.style.background = `${color}18`; e.currentTarget.style.borderColor = color; }}
      onMouseOut={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.04)"; e.currentTarget.style.borderColor = `${color}40`; }}
    >
      {icon}
      <span style={{ color }}>{label || value}</span>
    </a>
  );
};

const Profile = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const loggedUser = (() => {
    try { return JSON.parse(localStorage.getItem("user") || "null"); } catch { return null; }
  })();
  const isOwnProfile = loggedUser && String(loggedUser.id) === String(id);

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
    twitter: "", instagram: "", tiktok: "", facebook: "", website: ""
  });
  const [saving, setSaving] = useState(false);

  const socialConfig = [
    { key: "instagram", label: "Instagram", icon: <IconInstagram />, color: "#E1306C" },
    { key: "tiktok",    label: "TikTok",    icon: <IconTikTok />,    color: "#ffffff" },
    { key: "twitter",   label: "X",         icon: <IconTwitterX />,  color: "#ffffff" },
    { key: "facebook",  label: "Facebook",  icon: <IconFacebook />,  color: "#1877F2" },
    { key: "website",   label: "Web",       icon: <IconWebsite />,   color: "#00f2fe" },
  ];

  const normalizeUrl = (url) => {
    if (!url) return null;
    try {
      if (url.startsWith("/")) return `${API_BASE.replace(/\/$/, "")}${url}`;
      const parsed = new URL(url);
      if (parsed.hostname === "127.0.0.1" || parsed.hostname === "localhost") {
        return `${API_BASE.replace(/\/$/, "")}${parsed.pathname}${parsed.search || ""}`;
      }
      return url;
    } catch { return url; }
  };

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
      setProfileShape(remoteUser.profileShape || remoteUser.profile_shape || localStorage.getItem("profileShape") || "circle");
      setSocial({
        twitter:   remoteUser.social?.twitter   || remoteUser.twitter   || "",
        instagram: remoteUser.social?.instagram || remoteUser.instagram || "",
        tiktok:    remoteUser.social?.tiktok    || remoteUser.tiktok    || "",
        facebook:  remoteUser.social?.facebook  || remoteUser.facebook  || "",
        website:   remoteUser.social?.website   || remoteUser.website   || ""
      });
      if (isOwnProfile) saveUserToStorage(remoteUser);
    } catch (err) { console.debug("fetchUser error", err); }
  };

  useEffect(() => { fetchUser(id); }, [id]);

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
      if (response.status === 401) { handleExpiredSession(navigate); return; }
      if (response.ok) {
        const data = await response.json();
        if (data.user) {
          if (data.user.background) data.user.background = normalizeUrl(data.user.background);
          setUser(data.user);
          saveUserToStorage(data.user);
        } else if (data.background) {
          const merged = { ...(user || {}), background: normalizeUrl(data.background) };
          setUser(merged);
          saveUserToStorage(merged);
        } else { fetchUser(); }
        alert("Fondo actualizado.");
      } else {
        const errorData = await response.json().catch(() => ({}));
        alert("Error: " + (errorData.msg || "No se pudo subir la imagen"));
      }
    } catch (error) {
      alert("Error de conexión con el servidor");
    } finally { setUploadingBg(false); }
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
      if (res.status === 401) { handleExpiredSession(navigate); return; }
      let data = null;
      try { data = await res.json(); } catch(e) { data = null; }
      if (res.ok) {
        const newUrl = data?.profile_pic || data?.profilePic || (data?.user && (data.user.profile_pic || data.user.profilePic));
        if (newUrl) {
          const normalized = normalizeUrl(newUrl);
          const merged = { ...(user || {}), profile_pic: normalized, profilePic: normalized };
          setUser(merged);
          saveUserToStorage(merged);
          setSelectedProfileFile(null);
          setPreviewProfilePic(null);
        } else { await fetchUser(); }
        alert("Foto de perfil actualizada.");
      } else {
        alert("Error subiendo avatar: " + ((data && (data.msg || data.error)) || `Status ${res.status}`));
      }
    } catch (err) {
      alert("Error de red subiendo avatar.");
    } finally { setUploadingProfile(false); }
  };

  const persistProfileShapeLocally = (shape) => {
    setProfileShape(shape);
    localStorage.setItem("profileShape", shape);
    const merged = { ...(user || {}), profileShape: shape };
    setUser(merged);
    saveUserToStorage(merged);
  };

  const handleSaveProfile = async () => {
    if (!user || !user.id) { alert("Usuario no encontrado."); return; }
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
        } catch { alert("Error de red subiendo la foto de perfil."); setUploadingProfile(false); setSaving(false); return; }

        if (uploadRes.status === 401) { handleExpiredSession(navigate); setUploadingProfile(false); setSaving(false); return; }

        const uploadText = await uploadRes.text();
        let upData = null;
        try { upData = JSON.parse(uploadText); } catch { upData = null; }
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
          alert("Error subiendo la foto de perfil: " + (upData?.msg || upData?.error || uploadRes.status));
          setUploadingProfile(false); setSaving(false); return;
        }
        setUploadingProfile(false);
      }

      const bodyToSend = {
        profile_shape: profileShape,
        profileShape,
        social: {
          twitter:   social.twitter   || "",
          instagram: social.instagram || "",
          tiktok:    social.tiktok    || "",
          facebook:  social.facebook  || "",
          website:   social.website   || ""
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

      if (patchRes.status === 401) { handleExpiredSession(navigate); setSaving(false); return; }

      const patchText = await patchRes.text();
      let patchData = null;
      try { patchData = JSON.parse(patchText); } catch { patchData = null; }

      if (patchRes.ok) {
        if (patchData?.user) {
          const ruser = patchData.user;
          if (ruser.background) ruser.background = normalizeUrl(ruser.background);
          if (ruser.profile_pic) ruser.profile_pic = normalizeUrl(ruser.profile_pic);
          if (ruser.profilePic) ruser.profilePic = normalizeUrl(ruser.profilePic);
          updatedUser = { ...updatedUser, ...ruser };
        } else {
          updatedUser = { ...updatedUser, profileShape, social: bodyToSend.social };
        }
        if (updatedUser.profilePic) updatedUser.profilePic = normalizeUrl(updatedUser.profilePic);
        if (updatedUser.profile_pic) updatedUser.profile_pic = normalizeUrl(updatedUser.profile_pic);
        if (updatedUser.background) updatedUser.background = normalizeUrl(updatedUser.background);
        setUser(updatedUser);
        saveUserToStorage(updatedUser);
        setSelectedProfileFile(null);
        setPreviewProfilePic(null);
        await fetchUser();
        alert("Perfil actualizado correctamente.");
      } else {
        alert("Error al guardar el perfil: " + (patchData?.msg || patchData?.error || patchText || `Status ${patchRes.status}`));
      }
    } catch (err) {
      console.error("Error guardando perfil:", err);
      alert("Error de conexión al guardar el perfil.");
    } finally { setSaving(false); }
  };

  const heroBg = user?.background
    ? `linear-gradient(rgba(0,0,0,0.55), rgba(0,0,0,0.55)), url(${normalizeUrl(user.background)})`
    : "linear-gradient(135deg, #0f2027 0%, #203a43 50%, #2c5364 100%)";

  const avatarBorderRadius = profileShape === "circle" ? "50%" : "12px";
  const avatarBg = previewProfilePic
    ? `url(${previewProfilePic}) center/cover no-repeat`
    : user?.profilePic ? `url(${normalizeUrl(user.profilePic)}) center/cover no-repeat`
    : user?.profile_pic ? `url(${normalizeUrl(user.profile_pic)}) center/cover no-repeat`
    : user?.background ? `url(${normalizeUrl(user.background)}) center/cover no-repeat`
    : "linear-gradient(135deg,#00f2fe,#4facfe)";
  const avatarInitial = !previewProfilePic && !user?.profilePic && !user?.profile_pic && !user?.background
    ? (user?.name ? user.name.charAt(0).toUpperCase() : "?")
    : null;

  if (!user) return <div style={{ color: "#fff", padding: 20 }}>Cargando perfil...</div>;

  return (
    <div style={{ background: "#0d1117", minHeight: "100vh" }}>
      {/* HERO */}
      <div className="text-center text-white" style={{
        backgroundImage: heroBg, backgroundSize: "cover", backgroundPosition: "center",
        minHeight: "320px", display: "flex", flexDirection: "column",
        justifyContent: "center", alignItems: "center",
        padding: "40px 20px 30px", position: "relative"
      }}>
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "4px", background: "linear-gradient(to right, #00f2fe, #4facfe, #f9d423)" }} />

        <div style={{
          width: "96px", height: "96px", borderRadius: avatarBorderRadius,
          background: avatarBg, display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: "2.2rem", fontWeight: "900", color: "#000",
          marginBottom: "12px", boxShadow: "0 0 30px rgba(0,242,254,0.25)", overflow: "hidden"
        }}>
          {avatarInitial}
        </div>

        <p style={{ color: "#f9d423", letterSpacing: "3px", fontSize: "0.7rem", textTransform: "uppercase", marginBottom: "6px" }}>
          {isOwnProfile ? "Tu perfil viajero" : "Perfil viajero"}
        </p>
        <h1 className="fw-black mb-2" style={{ fontSize: "2.2rem", letterSpacing: "-1px" }}>
          {user?.name}{" "}
          <span style={{ background: "linear-gradient(135deg, #00f2fe 0%, #4facfe 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>✈️</span>
        </h1>

        {isOwnProfile && (
          <p style={{ color: "rgba(255,255,255,0.6)", fontSize: "0.95rem", marginBottom: "18px" }}>{user?.email}</p>
        )}

        {socialConfig.some(s => social[s.key]) && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", justifyContent: "center", marginBottom: "16px" }}>
            {socialConfig.map(s => (
              <SocialChip key={s.key} platform={s.key} value={social[s.key]} icon={s.icon} color={s.color} label={s.label} />
            ))}
          </div>
        )}

        {isOwnProfile && (
          <>
            <input type="file" ref={fileInputBgRef} onChange={handleUploadBackground} style={{ display: "none" }} accept="image/*" />
            <button onClick={() => fileInputBgRef.current.click()} disabled={uploadingBg} className="btn fw-bold rounded-pill"
              style={{
                background: uploadingBg ? "rgba(255,255,255,0.08)" : "linear-gradient(135deg,#f9d423,#ff4e50)",
                border: "none", color: "#000", padding: "8px 22px", fontSize: "0.9rem",
                boxShadow: "0 0 12px rgba(249,212,35,0.2)"
              }}>
              {uploadingBg ? <><span className="spinner-border spinner-border-sm me-2"></span>Subiendo...</> : "📷 Cambiar imagen de fondo"}
            </button>
          </>
        )}
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "1px", background: "linear-gradient(to right, transparent, #00f2fe, transparent)" }} />
      </div>

      {/* CONTENT */}
      <div className="container py-5" style={{ maxWidth: "900px" }}>
        <div className="d-flex align-items-center mb-5">
          <div style={{ height: "2px", flex: 1, background: "linear-gradient(to right, transparent, rgba(0,242,254,0.3))" }} />
          <span className="mx-3 fw-bold text-uppercase" style={{ color: "rgba(255,255,255,0.4)", letterSpacing: "3px", fontSize: "0.75rem" }}>Información</span>
          <div style={{ height: "2px", flex: 1, background: "linear-gradient(to left, transparent, rgba(0,242,254,0.3))" }} />
        </div>

        <div className="row g-4">
          <div className="col-md-6">
            <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "16px", padding: "24px", height: "100%" }}>
              <h5 className="fw-bold mb-4" style={{ color: "#00f2fe", letterSpacing: "2px", fontSize: "0.8rem", textTransform: "uppercase" }}>
                📋 Información Personal
              </h5>
              <div className="mb-3">
                <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "1.5px", marginBottom: "6px" }}>Nombre</p>
                <p className="fw-bold mb-0" style={{ color: "#fff", fontSize: "1.05rem" }}>{user?.name}</p>
              </div>
              {isOwnProfile && (
                <div className="mb-3">
                  <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "1.5px", marginBottom: "6px" }}>Correo Electrónico</p>
                  <p className="fw-bold mb-0" style={{ color: "#fff", fontSize: "1.05rem" }}>{user?.email}</p>
                </div>
              )}
              <hr style={{ border: "none", height: "1px", background: "rgba(255,255,255,0.04)", margin: "14px 0" }} />

              {isOwnProfile ? (
                <>
                  <div className="mb-3">
                    <p style={{ color: "rgba(255,255,255,0.6)", marginBottom: "8px" }}>Foto de perfil</p>
                    <div style={{ display: "flex", gap: "12px", alignItems: "center", marginBottom: "10px" }}>
                      <div style={{
                        width: "72px", height: "72px",
                        borderRadius: profileShape === "circle" ? "50%" : "12px",
                        background: avatarBg, display: "grid", placeItems: "center",
                        color: "#000", fontWeight: 900, overflow: "hidden",
                        boxShadow: "0 8px 20px rgba(0,0,0,0.6)"
                      }}>
                        {avatarInitial}
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                        <label className="btn btn-sm" style={{
                          padding: "6px 10px", borderRadius: "999px",
                          background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)",
                          color: "rgba(255,255,255,0.9)", cursor: "pointer"
                        }}>
                          Seleccionar foto
                          <input type="file" accept="image/*" onChange={handleSelectProfileFile} style={{ display: "none" }} />
                        </label>
                        <div style={{ display: "flex", gap: "6px" }}>
                          <button onClick={() => persistProfileShapeLocally("circle")} className="btn btn-sm" style={{
                            padding: "6px 10px", borderRadius: "999px",
                            background: profileShape === "circle" ? "linear-gradient(135deg,#00f2fe,#4facfe)" : "rgba(255,255,255,0.03)",
                            color: profileShape === "circle" ? "#000" : "rgba(255,255,255,0.9)",
                            border: profileShape === "circle" ? "none" : "1px solid rgba(255,255,255,0.06)"
                          }}>Circular</button>
                          <button onClick={() => persistProfileShapeLocally("square")} className="btn btn-sm" style={{
                            padding: "6px 10px", borderRadius: "999px",
                            background: profileShape === "square" ? "linear-gradient(135deg,#f9d423,#ff4e50)" : "rgba(255,255,255,0.03)",
                            color: profileShape === "square" ? "#000" : "rgba(255,255,255,0.9)",
                            border: profileShape === "square" ? "none" : "1px solid rgba(255,255,255,0.06)"
                          }}>Cuadrado</button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mb-3">
                    <p style={{ color: "rgba(255,255,255,0.6)", marginBottom: "10px", fontSize: "0.85rem" }}>🔗 Redes sociales</p>
                    {socialConfig.map(s => (
                      <div key={s.key} style={{ position: "relative", marginBottom: "8px" }}>
                        <span style={{
                          position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)",
                          display: "flex", alignItems: "center", pointerEvents: "none"
                        }}>{s.icon}</span>
                        <input
                          placeholder={`${s.label} (usuario o URL)`}
                          value={social[s.key]}
                          onChange={(e) => setSocial(prev => ({ ...prev, [s.key]: e.target.value }))}
                          className="form-control"
                          style={{
                            background: "rgba(255,255,255,0.02)",
                            border: `1px solid ${social[s.key] ? s.color + "60" : "rgba(255,255,255,0.06)"}`,
                            color: "#fff", paddingLeft: "40px",
                            borderRadius: "10px", fontSize: "0.82rem"
                          }}
                        />
                      </div>
                    ))}
                  </div>

                  <div className="d-flex gap-2 mt-3">
                    <button onClick={handleSaveProfile} disabled={saving || uploadingProfile}
                      className="btn fw-bold rounded-pill"
                      style={{ background: "linear-gradient(135deg,#00f2fe,#4facfe)", color: "#000", border: "none", padding: "8px 18px" }}>
                      {saving || uploadingProfile
                        ? <><span className="spinner-border spinner-border-sm me-2"></span>Guardando...</>
                        : "Guardar cambios"}
                    </button>
                    <Link to="/my-posts" className="btn btn-outline-secondary"
                      style={{ color: "rgba(255,255,255,0.85)", borderRadius: "999px", border: "1px solid rgba(255,255,255,0.06)" }}>
                      📝 Ver mis publicaciones
                    </Link>
                  </div>
                </>
              ) : (
                <div>
                  <p style={{ color: "rgba(255,255,255,0.35)", fontSize: "0.85rem", fontStyle: "italic", marginBottom: "16px" }}>
                    👁️ Estás viendo el perfil de otro usuario.
                  </p>
                  {socialConfig.some(s => social[s.key]) && (
                    <div>
                      <p style={{ color: "rgba(255,255,255,0.6)", marginBottom: "10px", fontSize: "0.85rem" }}>🔗 Redes sociales</p>
                      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                        {socialConfig.map(s => (
                          <SocialChip key={s.key} platform={s.key} value={social[s.key]} icon={s.icon} color={s.color} label={`${s.label}: ${social[s.key]}`} />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="col-md-6">
            <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "16px", padding: "24px", height: "100%" }}>
              <h5 className="fw-bold mb-4" style={{ color: "#f9d423", letterSpacing: "2px", fontSize: "0.8rem", textTransform: "uppercase" }}>
                📊 Estadísticas
              </h5>
              <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.95rem", lineHeight: "1.7" }}>
                Próximamente podrás ver aquí el impacto de tus publicaciones, seguidores y destinos favoritos.
              </p>
              {isOwnProfile && (
                <div style={{ marginTop: "18px" }}>
                  <p style={{ color: "rgba(255,255,255,0.6)", marginBottom: "10px", fontSize: "0.85rem" }}>🔗 Redes públicas</p>
                  {socialConfig.some(s => social[s.key]) ? (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                      {socialConfig.map(s => (
                        <SocialChip key={s.key} platform={s.key} value={social[s.key]} icon={s.icon} color={s.color} label={s.label} />
                      ))}
                    </div>
                  ) : (
                    <div style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.82rem" }}>No has agregado redes sociales.</div>
                  )}
                </div>
              )}
              <div className="mt-4 d-flex gap-3 flex-wrap">
                {["Publicaciones", "Seguidores", "Favoritos"].map((stat) => (
                  <div key={stat} style={{
                    background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: "12px", padding: "10px 14px", textAlign: "center", flex: "1", minWidth: "80px"
                  }}>
                    <p className="fw-black mb-1" style={{ color: "#00f2fe", fontSize: "1.2rem" }}>—</p>
                    <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "1px", marginBottom: 0 }}>{stat}</p>
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