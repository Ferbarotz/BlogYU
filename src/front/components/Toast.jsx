// Contenedor de toasts (esquina inferior derecha). Estilos inline, sin CSS global.
import React from "react";

const ACCENT = {
  success: "#2ecc71",
  error: "#ff4e50",
  info: "#00e5ff",
};
const ICON = { success: "✅", error: "⚠️", info: "ℹ️" };

export default function Toast({ toasts = [], onDismiss }) {
  if (!toasts.length) return null;
  return (
    <div
      aria-live="polite"
      style={{
        position: "fixed", right: "20px", bottom: "20px", zIndex: 3000,
        display: "flex", flexDirection: "column", gap: "10px",
        width: "min(92vw, 380px)", pointerEvents: "none",
      }}
    >
      {toasts.map((t) => {
        const accent = ACCENT[t.type] || ACCENT.info;
        return (
          <div
            key={t.id}
            role={t.type === "error" ? "alert" : "status"}
            style={{
              pointerEvents: "auto",
              display: "flex", alignItems: "flex-start", gap: "10px",
              background: "#1a1a2e", color: "#fff",
              border: "1px solid #00e5ff", borderLeft: `4px solid ${accent}`,
              borderRadius: "12px", padding: "12px 14px",
              fontSize: "0.9rem", lineHeight: 1.4,
              boxShadow: "0 10px 30px rgba(0,0,0,0.55), 0 0 12px rgba(0,229,255,0.15)",
              wordBreak: "break-word",
            }}
          >
            <span aria-hidden="true">{ICON[t.type] || ICON.info}</span>
            <span style={{ flex: 1 }}>{t.message}</span>
            {onDismiss && (
              <button
                type="button"
                onClick={() => onDismiss(t.id)}
                aria-label="Cerrar notificación"
                style={{ background: "none", border: "none", color: "rgba(255,255,255,0.7)", fontSize: "1.1rem", lineHeight: 1, cursor: "pointer", padding: 0 }}
              >×</button>
            )}
          </div>
        );
      })}
    </div>
  );
}
