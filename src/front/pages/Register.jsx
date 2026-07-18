import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { API_BASE } from '../api/backend';

const Register = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ name: '', email: '', password: '', confirmPassword: '' });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [message, setMessage] = useState('');

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      setMessage("Las contraseñas no coinciden");
      return;
    }
    setLoading(true);
    setMessage('');
    try {
      const response = await fetch(`${API_BASE}/api/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: formData.name, email: formData.email, password: formData.password })
      });
      if (response.ok) {
        navigate("/login");
      } else {
        const errorData = await response.json().catch(() => ({}));
        setMessage(errorData.msg || "No se pudo crear el usuario");
      }
    } catch (error) {
      setMessage("Error de conexión con el servidor");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{ minHeight: "100vh", background: "#0d1117" }} // Fondo oscuro de marca
      className="d-flex align-items-center justify-content-center p-4"
    >
      {/* Fondo decorativo con luces azules */}
      <div style={{
        position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
        background: "radial-gradient(ellipse at 80% 50%, rgba(0, 242, 254, 0.07) 0%, transparent 60%), radial-gradient(ellipse at 20% 20%, rgba(79, 172, 254, 0.08) 0%, transparent 60%)",
        pointerEvents: "none"
      }} />

      <div style={{ width: "100%", maxWidth: "460px", position: "relative" }}>

        {/* ── LOGO / TÍTULO ── */}
        <div className="text-center mb-4">
          <Link to="/" style={{ textDecoration: "none" }}>
            <h2 className="fw-black mb-0" style={{ fontSize: "2.2rem", letterSpacing: "-1px", color: "#fff" }}>
              Blog
              <span style={{
                background: "linear-gradient(135deg, #00f2fe 0%, #4facfe 100%)", // Gradiente azul de marca
                WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent"
              }}>
                YU
              </span>
            </h2>
            <p style={{ color: "#f9d423", letterSpacing: "4px", fontSize: "0.65rem", textTransform: "uppercase", marginTop: "2px" }}>
              Comunidad Viajera
            </p>
          </Link>
        </div>

        {/* ── CARD ── */}
        <div style={{
          background: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: "24px",
          overflow: "hidden",
          boxShadow: "0 25px 50px rgba(0,0,0,0.6)",
          backdropFilter: "blur(10px)"
        }}>

          {/* Línea decorativa superior (Azul a Amarillo) */}
          <div style={{
            height: "4px",
            background: "linear-gradient(to right, #00f2fe, #4facfe, #f9d423)"
          }} />

          <div className="p-4 p-md-5">

            <div className="mb-4">
              <p style={{ color: "#f9d423", letterSpacing: "3px", fontSize: "0.7rem", textTransform: "uppercase", marginBottom: "6px" }}>
                Registro
              </p>
              <h3 className="fw-black text-white mb-1" style={{ fontSize: "1.8rem" }}>
                Crear Cuenta ✨
              </h3>
              <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.9rem" }}>
                Únete a nuestra comunidad de viajeros
              </p>
            </div>

            <form onSubmit={handleSubmit}>

              {/* NOMBRE */}
              <div className="mb-3">
                <label style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "2px" }} className="d-block mb-2">
                  Nombre Completo
                </label>
                <div className="input-group">
                  <span className="input-group-text border-end-0" style={{
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    color: "rgba(255,255,255,0.5)"
                  }}>
                    👤
                  </span>
                  <input
                    name="name"
                    type="text"
                    placeholder="Tu nombre"
                    onChange={handleChange}
                    value={formData.name}
                    required
                    style={{
                      background: "rgba(255,255,255,0.05)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderLeft: "none",
                      color: "#fff",
                      borderRadius: "0 8px 8px 0",
                      padding: "10px 14px",
                      outline: "none"
                    }}
                    className="form-control shadow-none"
                  />
                </div>
              </div>

              {/* EMAIL */}
              <div className="mb-3">
                <label style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "2px" }} className="d-block mb-2">
                  Correo Electrónico
                </label>
                <div className="input-group">
                  <span className="input-group-text border-end-0" style={{
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    color: "rgba(255,255,255,0.5)"
                  }}>
                    📧
                  </span>
                  <input
                    name="email"
                    type="email"
                    placeholder="tu@email.com"
                    onChange={handleChange}
                    value={formData.email}
                    required
                    style={{
                      background: "rgba(255,255,255,0.05)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderLeft: "none",
                      color: "#fff",
                      borderRadius: "0 8px 8px 0",
                      padding: "10px 14px",
                      outline: "none"
                    }}
                    className="form-control shadow-none"
                  />
                </div>
              </div>

              {/* CONTRASEÑA */}
              <div className="mb-3">
                <label style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "2px" }} className="d-block mb-2">
                  Contraseña
                </label>
                <div className="input-group">
                  <span className="input-group-text border-end-0" style={{
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    color: "rgba(255,255,255,0.5)"
                  }}>
                    🔒
                  </span>
                  <input
                    name="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Mínimo 6 caracteres"
                    onChange={handleChange}
                    value={formData.password}
                    required
                    style={{
                      background: "rgba(255,255,255,0.05)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderLeft: "none",
                      borderRight: "none",
                      color: "#fff",
                      padding: "10px 14px",
                      outline: "none"
                    }}
                    className="form-control shadow-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      background: "rgba(255,255,255,0.05)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderLeft: "none",
                      color: "rgba(255,255,255,0.5)",
                      borderRadius: "0 8px 8px 0",
                      padding: "0 14px",
                      cursor: "pointer"
                    }}
                  >
                    {showPassword ? "🙈" : "👁️"}
                  </button>
                </div>
              </div>

              {/* CONFIRMAR CONTRASEÑA */}
              <div className="mb-4">
                <label style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "2px" }} className="d-block mb-2">
                  Confirmar Contraseña
                </label>
                <div className="input-group">
                  <span className="input-group-text border-end-0" style={{
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    color: "rgba(255,255,255,0.5)"
                  }}>
                    🔐
                  </span>
                  <input
                    name="confirmPassword"
                    type={showConfirm ? "text" : "password"}
                    placeholder="Repite tu contraseña"
                    onChange={handleChange}
                    value={formData.confirmPassword}
                    required
                    style={{
                      background: "rgba(255,255,255,0.05)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderLeft: "none",
                      borderRight: "none",
                      color: "#fff",
                      padding: "10px 14px",
                      outline: "none"
                    }}
                    className="form-control shadow-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    style={{
                      background: "rgba(255,255,255,0.05)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderLeft: "none",
                      color: "rgba(255,255,255,0.5)",
                      borderRadius: "0 8px 8px 0",
                      padding: "0 14px",
                      cursor: "pointer"
                    }}
                  >
                    {showConfirm ? "🙈" : "👁️"}
                  </button>
                </div>
                {formData.confirmPassword && (
                  <small className={`mt-2 d-block fw-bold ${formData.password === formData.confirmPassword ? "text-success" : "text-danger"}`} style={{ fontSize: '0.7rem' }}>
                    {formData.password === formData.confirmPassword ? "✓ Las contraseñas coinciden" : "✗ Las contraseñas no coinciden"}
                  </small>
                )}
              </div>

              {/* ERROR */}
              {message && (
                <div className="mb-3 py-2 px-3 text-center small rounded-3" style={{
                  background: "rgba(255,78,80,0.15)",
                  border: "1px solid rgba(255,78,80,0.3)",
                  color: "#ff6b6b"
                }}>
                  ⚠️ {message}
                </div>
              )}

              {/* BOTÓN REGISTRO */}
              <button
                type="submit"
                disabled={loading}
                className="btn w-100 fw-bold"
                style={{
                  background: loading
                    ? "rgba(255,255,255,0.1)"
                    : "linear-gradient(135deg, #f9d423 0%, #ff4e50 100%)",
                  border: "none", color: "#000",
                  padding: "12px", fontSize: "0.95rem",
                  borderRadius: "12px", letterSpacing: "1px",
                  boxShadow: "0 0 20px rgba(249, 212, 35, 0.3)",
                  transition: "all 0.3s ease"
                }}
                onMouseOver={(e) => !loading && (e.currentTarget.style.transform = "scale(1.02)")}
                onMouseOut={(e) => e.currentTarget.style.transform = "scale(1)"}
              >
                {loading ? (
                  <><span className="spinner-border spinner-border-sm me-2"></span>Creando...</>
                ) : (
                  "🚀 Crear mi cuenta"
                )}
              </button>
            </form>

            {/* SEPARADOR */}
            <div className="d-flex align-items-center my-4">
              <div style={{ flex: 1, height: "1px", background: "rgba(255,255,255,0.08)" }} />
              <span style={{ color: "rgba(255,255,255,0.3)", fontSize: "0.75rem", margin: "0 12px" }}>¿Ya eres miembro?</span>
              <div style={{ flex: 1, height: "1px", background: "rgba(255,255,255,0.08)" }} />
            </div>

            {/* LINK LOGIN */}
            <Link
              to="/login"
              className="btn w-100 fw-bold"
              style={{
                background: "transparent",
                border: "1px solid rgba(255,255,255,0.15)",
                color: "rgba(255,255,255,0.7)",
                padding: "11px", fontSize: "0.9rem",
                borderRadius: "12px", letterSpacing: "0.5px",
                transition: "all 0.3s ease"
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.borderColor = "rgba(0, 242, 254, 0.5)";
                e.currentTarget.style.color = "#00f2fe";
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.borderColor = "rgba(255,255,255,0.15)";
                e.currentTarget.style.color = "rgba(255,255,255,0.7)";
              }}
            >
              🔑 Iniciar Sesión
            </Link>
          </div>
        </div>

        {/* FOOTER */}
        <p className="text-center mt-4" style={{ color: "rgba(255,255,255,0.2)", fontSize: "0.75rem" }}>
          BlogYU · Comunidad Viajera
        </p>
      </div>

      <style>{`
        body { background: #0d1117 !important; }
        input::placeholder { color: rgba(255,255,255,0.25) !important; }
        input:-webkit-autofill {
          -webkit-box-shadow: 0 0 0 1000px rgba(255,255,255,0.05) inset !important;
          -webkit-text-fill-color: #fff !important;
        }
      `}</style>
    </div>
  );
};

export default Register;