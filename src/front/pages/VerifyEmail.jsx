import React, { useEffect, useRef, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { API_BASE } from '../api/backend';
import ResendVerification from '../components/ResendVerification';

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [state, setState] = useState(token ? 'loading' : 'error'); // loading | ok | error
  const [message, setMessage] = useState(token ? '' : 'El enlace no contiene un token de confirmación.');
  const sent = useRef(false); // evita la doble llamada de React StrictMode

  useEffect(() => {
    if (!token || sent.current) return;
    sent.current = true;
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/verify-email`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        });
        const data = await res.json().catch(() => ({}));
        setState(res.ok ? 'ok' : 'error');
        setMessage(data.msg || (res.ok ? 'Email confirmado.' : 'No se pudo confirmar el email.'));
      } catch {
        setState('error');
        setMessage('Error de conexión con el servidor. Recarga la página para intentarlo de nuevo.');
      }
    })();
  }, [token]);

  const box = (bg, border, color) => ({ background: bg, border: `1px solid ${border}`, color });

  return (
    <div style={{ minHeight: '100vh', background: '#0d1117' }} className="d-flex align-items-center justify-content-center p-4">
      <div style={{ width: '100%', maxWidth: '480px' }}>
        <div className="text-center mb-4">
          <Link to="/" style={{ textDecoration: 'none' }}>
            <h2 className="fw-black mb-0" style={{ fontSize: '2.2rem', letterSpacing: '-1px', color: '#fff' }}>
              Blog<span style={{ background: 'linear-gradient(135deg, #00f2fe 0%, #4facfe 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>YU</span>
            </h2>
            <p style={{ color: '#f9d423', letterSpacing: '4px', fontSize: '0.65rem', textTransform: 'uppercase', marginTop: '2px' }}>
              Comunidad Viajera
            </p>
          </Link>
        </div>

        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '20px', overflow: 'hidden', boxShadow: '0 25px 50px rgba(0,0,0,0.5)' }}>
          <div style={{ height: '4px', background: 'linear-gradient(to right, #00f2fe, #4facfe, #f9d423)' }} />
          <div className="p-4 p-md-5">
            <p style={{ color: '#f9d423', letterSpacing: '3px', fontSize: '0.7rem', textTransform: 'uppercase', marginBottom: '6px' }}>Confirmar email</p>

            {state === 'loading' && (
              <p className="text-white mb-0"><span className="spinner-border spinner-border-sm me-2" />Confirmando tu email...</p>
            )}

            {state === 'ok' && (
              <>
                <div className="mb-3 py-2 px-3 small rounded-3" style={box('rgba(0,242,254,0.08)', 'rgba(0,242,254,0.2)', '#bff7ff')}>
                  ✅ {message}
                </div>
                <Link to="/login" className="btn w-100 fw-bold" style={{ background: 'linear-gradient(135deg, #00f2fe 0%, #4facfe 100%)', color: '#000', borderRadius: '10px', padding: '12px' }}>
                  Iniciar sesión
                </Link>
              </>
            )}

            {state === 'error' && (
              <>
                <div className="mb-3 py-2 px-3 small rounded-3" style={box('rgba(255,78,80,0.12)', 'rgba(255,78,80,0.2)', '#ffb6b6')}>
                  ⚠️ {message}
                </div>
                <p className="small mb-1" style={{ color: 'rgba(255,255,255,0.5)' }}>Solicita un nuevo enlace:</p>
                <ResendVerification />
                <Link to="/login" className="d-block text-center mt-3 small" style={{ color: 'rgba(255,255,255,0.6)' }}>Volver al login</Link>
              </>
            )}
          </div>
        </div>
      </div>
      <style>{`body { background: #0d1117 !important; } input::placeholder { color: rgba(255,255,255,0.25) !important; }`}</style>
    </div>
  );
}
