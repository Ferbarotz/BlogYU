// src/front/api/backend.js
// Versión robusta para entornos dev remotos (Codespaces, Github.dev, etc.)
// Preferencia de valores:
// 1) process.env.REACT_APP_API_BASE (inyectado en build)
// 2) window.__API_BASE (defínelo en public/index.html si quieres)
// 3) heurística: si estamos en 8080, intenta cambiar a 5000
// 4) window.location.origin como fallback

const envApiBase =
  (typeof process !== "undefined" && process.env && process.env.REACT_APP_API_BASE)
    ? process.env.REACT_APP_API_BASE
    : undefined;

function inferFromOrigin() {
  if (typeof window === "undefined") return "http://localhost:5000";
  try {
    const protocol = window.location.protocol || "https:";
    const host = window.location.hostname;
    const port = window.location.port || "";
    const origin = window.location.origin || `${protocol}//${host}${port ? `:${port}` : ""}`;

    // Heurística Codespaces / forwarded ports:
    // - si el frontend está en 8080, intentamos el mismo host con puerto 5000
    // - si el hostname contiene "-8080.app.github.dev" intentamos "-5000"
    if (port === "8080" || origin.includes(":8080") || origin.includes("-8080.app.github.dev")) {
      // intentos seguros de reemplazo
      if (origin.includes("-8080.app.github.dev")) {
        return origin.replace("-8080.app.github.dev", "-5000.app.github.dev");
      }
      return origin.replace(/:8080$/, ":5000");
    }
    // Si el origin ya parece de backend (no 8080), devolvemos origin
    return origin;
  } catch (e) {
    return "http://localhost:5000";
  }
}

const API_BASE = envApiBase ||
  (typeof window !== "undefined" && window.__API_BASE) ||
  inferFromOrigin();

console.info("[backend] API_BASE =", API_BASE);

export default API_BASE;
export { API_BASE };

// authHeaders: retorna headers (si hay token lo incluye)
export const authHeaders = () => {
  try {
    const token = localStorage.getItem("token");
    return token ? { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } : { "Content-Type": "application/json" };
  } catch (e) {
    return { "Content-Type": "application/json" };
  }
};