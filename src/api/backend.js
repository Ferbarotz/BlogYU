// src/front/api/backend.js
// Forzamos la URL del backend para que el frontend sepa a dónde ir
const API_BASE = "https://super-duper-engine-7vw7gxv9w9xvfj9j5-5000.app.github.dev";

export default API_BASE;
export { API_BASE };

export function authHeaders() {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}