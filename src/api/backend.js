import { API_BASE } from '../api/backend';
// src/api/backend.js
// Detecta automáticamente la URL del backend según el entorno

export const API_BASE = "http://localhost:5000";

const getBackendURL = () => {
  if (typeof window !== "undefined") {
    const hostname = window.location.hostname;
    // Si estamos en Codespaces, reemplaza el puerto 8080 por 5000
    if (hostname.includes(".app.github.dev")) {
      return hostname.replace("-8080.", "-5000.");
    }
    // Si estamos en local
    return "http://localhost:5000";
  }
  return "http://localhost:5000";
};

const API_BASE = `https://${getBackendURL()}`;

export default API_BASE;
export { API_BASE };

export function authHeaders() {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}


