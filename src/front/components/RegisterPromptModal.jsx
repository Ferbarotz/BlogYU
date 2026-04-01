// src/front/components/RegisterPromptModal.jsx
import React from "react";

const RegisterPromptModal = ({ show, onClose, onLogin, onRegister }) => {
  if (!show) return null;

  return (
    <div style={{
      position: "fixed",
      inset: 0,
      zIndex: 2200,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "linear-gradient(180deg, rgba(0,0,0,0.6), rgba(0,0,0,0.75))",
      padding: 16
    }}>
      <div style={{
        width: "100%",
        maxWidth: 720,
        background: "#061017",
        borderRadius: 14,
        padding: 22,
        boxShadow: "0 12px 40px rgba(0,0,0,0.7)",
        border: "1px solid rgba(255,255,255,0.04)",
        color: "#fff",
        overflow: "hidden"
      }}>
        <div className="d-flex justify-content-between align-items-start mb-2">
          <div>
            <h2 style={{ margin: 0, fontSize: "1.4rem", letterSpacing: "-0.4px" }}>
              🔒 Contenido exclusivo
            </h2>
            <p style={{ margin: "6px 0 0", color: "rgba(255,255,255,0.75)" }}>
              Para ver el detalle completo debes ser miembro de la comunidad.
            </p>
          </div>
          <button onClick={onClose} className="btn btn-sm btn-outline-light" style={{ opacity: 0.9 }}>✕</button>
        </div>

        <div style={{ display: "flex", gap: 18, alignItems: "center", marginTop: 10, flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 220 }}>
            <p style={{ color: "rgba(255,255,255,0.95)", fontWeight: 700, fontSize: "1rem", marginBottom: 8 }}>
              ¿Por qué registrarte? — rápido, valioso y hecho para viajeros
            </p>
            <ul style={{ color: "rgba(255,255,255,0.8)", margin: "6px 0 0 18px", lineHeight: 1.5 }}>
              <li>Accede a todos los detalles de cada publicación y ruta.</li>
              <li>Guarda favoritos, comenta y comparte tus experiencias.</li>
              <li>Conéctate con otros viajeros y recibe recomendaciones reales.</li>
            </ul>
          </div>

          <div style={{ minWidth: 220, display: "flex", flexDirection: "column", gap: 10 }}>
            <button onClick={onRegister} className="btn btn-lg" style={{ background: "linear-gradient(90deg,#f9d423,#ff4e50)", color: "#000", fontWeight: 800 }}>
              ¡Crear cuenta y descubrir ahora! ✨
            </button>
            <button onClick={onLogin} className="btn btn-lg btn-outline-light" style={{ color: "#fff", fontWeight: 800 }}>
              Ya tengo cuenta — iniciar sesión
            </button>
            <button onClick={onClose} className="btn btn-sm btn-link" style={{ color: "rgba(255,255,255,0.6)", textDecoration: "underline" }}>
              Seguir navegando sin registrarme
            </button>
          </div>
        </div>

        <div style={{ marginTop: 14, color: "rgba(255,255,255,0.45)", fontSize: "0.85rem" }}>
          Nota: registrarte es gratis y te conecta con recomendaciones reales de viajeros como tú. ¡Hazlo hoy y no te pierdas ningún secreto!
        </div>
      </div>
    </div>
  );
};

export default RegisterPromptModal;