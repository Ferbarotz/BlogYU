// src/front/api/backend.js
// Usa window.__API_BASE (definido en public/index.html) si existe.
// Si no, intenta process.env.REACT_APP_API_BASE (cuando builds lo define).
// Finalmente fallback a window.location.origin.

const API_BASE =
  (typeof window !== "undefined" && window.__API_BASE) ||
  (typeof process !== "undefined" && process.env && process.env.REACT_APP_API_BASE) ||
  window.location.origin;

export default API_BASE;
export { API_BASE };

export function authHeaders() {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}