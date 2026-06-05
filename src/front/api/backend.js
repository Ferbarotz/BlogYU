/**
 * Devuelve la URL base del backend.
 * Prioridad:
 *  1) REACT_APP_BACKEND_URL / BACKEND_URL
 *  2) En Codespaces / localhost usa "" para aprovechar el proxy de webpack
 *  3) Fallback: http(s)://hostname:5000
 */
export function getBackendURL() {
  const env =
    (typeof process !== "undefined" &&
      process.env &&
      (process.env.REACT_APP_BACKEND_URL || process.env.BACKEND_URL)) ||
    null;

  if (env) return env.replace(/\/$/, "");

  const backendPort =
    (typeof process !== "undefined" &&
      process.env &&
      process.env.REACT_APP_BACKEND_PORT) ||
    "5000";

  if (typeof window === "undefined") {
    return `http://127.0.0.1:${backendPort}`;
  }

  const { hostname, protocol } = window.location;

  // En Codespaces y desarrollo local usamos rutas relativas
  // para que webpack proxy mande /api/* al puerto 5000
  if (
    hostname.includes("app.github.dev") ||
    hostname === "localhost" ||
    hostname === "127.0.0.1"
  ) {
    return "";
  }

  const url = `${protocol}//${hostname}:${backendPort}`;
  console.log("[backend.js] Inferred BACKEND:", url);
  return url;
}

export const API_BASE = getBackendURL();
export default getBackendURL;

/**
 * authHeaders(extra = {}) -> devuelve un objeto con Authorization si existe token en localStorage.
 * jsonAuthHeaders() -> devuelve headers con Content-Type: application/json y Authorization si aplica.
 *
 * Uso:
 *   import { authHeaders, jsonAuthHeaders, API_BASE, authFetch } from "../api/backend";
 *
 *   fetch(`${API_BASE}/api/endpoint`, { headers: authHeaders() })
 *   fetch(`${API_BASE}/api/endpoint`, { headers: jsonAuthHeaders(), method: 'POST', body: JSON.stringify(data)})
 *
 *   // authFetch permite pasar una ruta relativa o absoluta:
 *   authFetch('/api/posts', { method: 'GET' })
 */
export function authHeaders(extra = {}) {
  try {
    const token = localStorage.getItem("token");
    const headers = { ...extra };
    if (token) headers["Authorization"] = `Bearer ${token}`;
    return headers;
  } catch (e) {
    return { ...extra };
  }
}

export function jsonAuthHeaders() {
  return authHeaders({ "Content-Type": "application/json" });
}

/**
 * authFetch(path, options)
 * - path: puede ser ruta relativa como '/api/posts' o ruta sin slash 'api/posts' o URL absoluta
 * - options: fetch options (method, body, headers, ...)
 *
 * Devuelve la promesa de fetch. No hace parse automático.
 */
export async function authFetch(path, options = {}) {
  const base = (API_BASE || "").replace(/\/$/, "");
  const url =
    typeof path === "string" && /^https?:\/\//i.test(path)
      ? path
      : path && path.startsWith("/")
      ? `${base}${path}`
      : `${base}/${path}`;

  const combinedHeaders = { ...authHeaders(), ...(options.headers || {}) };
  const finalOptions = { ...options, headers: combinedHeaders };

  console.log("[authFetch]", finalOptions.method || "GET", url, finalOptions);

  return fetch(url, finalOptions);
}