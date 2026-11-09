// Botón para reenviar el correo de confirmación de email.
// Si no recibe `email`, muestra un campo para escribirlo.
import React, { useState } from 'react';
import { API_BASE } from '../api/backend';

export default function ResendVerification({ email: initialEmail = '' }) {
  const [email, setEmail] = useState(initialEmail);
  const [status, setStatus] = useState(null); // { ok: bool, text: string }
  const [sending, setSending] = useState(false);

  const resend = async () => {
    const value = (email || '').trim().toLowerCase();
    if (!value) {
      setStatus({ ok: false, text: 'Escribe tu email.' });
      return;
    }
    setSending(true);
    setStatus(null);
    try {
      const res = await fetch(`${API_BASE}/api/resend-verification`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: value }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 429) {
        setStatus({ ok: false, text: 'Demasiados intentos. Espera un minuto y vuelve a probar.' });
      } else {
        setStatus({ ok: res.ok, text: data.msg || (res.ok ? 'Correo reenviado.' : 'No se pudo reenviar el correo.') });
      }
    } catch {
      setStatus({ ok: false, text: 'Error de conexión con el servidor.' });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="mt-2">
      {!initialEmail && (
        <input
          type="email"
          placeholder="tu@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="form-control mb-2"
          style={{
            background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
            color: '#fff', padding: '10px 14px', borderRadius: '8px',
          }}
        />
      )}
      <button
        type="button"
        onClick={resend}
        disabled={sending}
        className="btn w-100"
        style={{
          background: 'transparent', border: '1px solid rgba(0,242,254,0.4)', color: '#00f2fe',
          padding: '8px', borderRadius: '10px', fontSize: '0.85rem',
        }}
      >
        {sending ? 'Enviando...' : '📧 Reenviar correo de confirmación'}
      </button>
      {status && (
        <p className="small mt-2 mb-0 text-center" style={{ color: status.ok ? '#bff7ff' : '#ffb6b6' }}>
          {status.text}
        </p>
      )}
    </div>
  );
}
