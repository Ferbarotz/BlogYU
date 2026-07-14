import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { API_BASE } from '../api/backend';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    setError(null);
    try {
      const normalizedEmail = email.trim().toLowerCase();
      const res = await fetch(`${API_BASE}/api/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: normalizedEmail }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setMessage(data.msg || 'Si el email existe, se ha enviado un link de recuperación.');
        setEmail('');
      } else {
        setError(data.msg || 'Error al enviar el correo.');
      }
    } catch (err) {
      setError('Error de conexión con el servidor.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#0d1117' }} className="d-flex align-items-center justify-content-center p-4">
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        background: 'radial-gradient(ellipse at 20% 50%, rgba(0,242,254,0.05) 0%, transparent 60%), radial-gradient(ellipse at 80% 20%, rgba(79,172,254,0.05) 0%, transparent 60%)',
        pointerEvents: 'none'
      }} />

      <div style={{ width: '100%', maxWidth: '520px', position: 'relative' }}>
        <div className="text-center mb-4">
          <Link to="/" style={{ textDecoration: 'none' }}>
            <h2 className="fw-black mb-0" style={{ fontSize: '2.2rem', letterSpacing: '-1px', color: '#fff' }}>
              Blog
              <span style={{
                background: 'linear-gradient(135deg, #00f2fe 0%, #4facfe 100%)',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'
              }}>YU</span>
            </h2>
            <p style={{ color: '#f9d423', letterSpacing: '4px', fontSize: '0.65rem', textTransform: 'uppercase', marginTop: '2px' }}>
              Comunidad Viajera
            </p>
          </Link>
        </div>

        <div style={{
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '20px',
          overflow: 'hidden',
          boxShadow: '0 25px 50px rgba(0,0,0,0.5)'
        }}>
          <div style={{ height: '4px', background: 'linear-gradient(to right, #00f2fe, #4facfe, #f9d423)' }} />
          <div className="p-4 p-md-5">
            <div className="mb-4">
              <p style={{ color: '#f9d423', letterSpacing: '3px', fontSize: '0.7rem', textTransform: 'uppercase', marginBottom: '6px' }}>Recuperar contraseña</p>
              <h3 className="fw-black text-white mb-1" style={{ fontSize: '1.6rem' }}>¿Olvidaste tu contraseña?</h3>
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem' }}>
                Ingresa tu correo y te enviaremos un enlace para restablecerla.
              </p>
            </div>

            {message && (
              <div className="mb-3 py-2 px-3 small rounded-3" style={{
                background: 'rgba(0,242,254,0.08)',
                border: '1px solid rgba(0,242,254,0.12)',
                color: '#bff7ff'
              }}>
                ✅ {message}
              </div>
            )}

            {error && (
              <div className="mb-3 py-2 px-3 small rounded-3" style={{
                background: 'rgba(255,78,80,0.12)',
                border: '1px solid rgba(255,78,80,0.2)',
                color: '#ffb6b6'
              }}>
                ⚠️ {error}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="mb-3">
                <label style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '2px' }} className="d-block mb-2">Correo Electrónico</label>
                <div className="input-group">
                  <span className="input-group-text border-end-0" style={{
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: 'rgba(255,255,255,0.5)'
                  }}>📧</span>
                  <input
                    name="email"
                    type="email"
                    placeholder="tu@email.com"
                    onChange={(e) => setEmail(e.target.value)}
                    value={email}
                    required
                    style={{
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderLeft: 'none',
                      color: '#fff',
                      borderRadius: '0 8px 8px 0',
                      padding: '10px 14px',
                      outline: 'none'
                    }}
                    className="form-control"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn w-100 fw-bold"
                style={{
                  background: loading ? 'rgba(255,255,255,0.08)' : 'linear-gradient(135deg, #00f2fe 0%, #4facfe 100%)',
                  border: 'none', color: '#000',
                  padding: '12px', fontSize: '0.95rem',
                  borderRadius: '10px', letterSpacing: '1px',
                  boxShadow: '0 0 20px rgba(0, 242, 254, 0.18)'
                }}
              >
                {loading ? (<><span className="spinner-border spinner-border-sm me-2"></span>Enviando...</>) : 'Enviar enlace de recuperación'}
              </button>
            </form>

            <div className="d-flex align-items-center my-4">
              <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.06)' }} />
              <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.75rem', margin: '0 12px' }}>¿Recordaste?</span>
              <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.06)' }} />
            </div>

            <Link to="/login" className="btn w-100 fw-bold" style={{
              background: 'transparent',
              border: '1px solid rgba(255,255,255,0.15)',
              color: 'rgba(255,255,255,0.9)',
              padding: '11px', fontSize: '0.9rem',
              borderRadius: '10px'
            }}>
              ← Volver al inicio de sesión
            </Link>
          </div>
        </div>

        <p className="text-center mt-4" style={{ color: 'rgba(255,255,255,0.2)', fontSize: '0.75rem' }}>
          BlogYU · Comunidad Viajera
        </p>
      </div>

      <style>{`
        body { background: #0d1117 !important; }
        input::placeholder { color: rgba(255,255,255,0.25) !important; }
      `}</style>
    </div>
  );
}