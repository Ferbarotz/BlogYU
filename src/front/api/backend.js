// src/front/api/backend.js
/**
 * Devuelve la URL base del backend.
 * Prioridad:
 *  1) REACT_APP_BACKEND_URL / BACKEND_URL
 *  2) Detección Codespaces: transforma -8080. -> -5000.
 *  3) Fallback: http(s)://hostname:5000
 */
function getBackendURL() {
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

  if (typeof window === "undefined") return `http://127.0.0.1:${backendPort}`;

  const { hostname, port, protocol } = window.location;

  // Codespaces: something-8080.app.github.dev -> something-5000.app.github.dev
  if (hostname && hostname.includes("app.github.dev")) {
    const frontendPort = port || "8080";
    const replaced = hostname.replace(`-${frontendPort}.`, `-${backendPort}.`);
    const url = `https://${replaced}`;
    console.log("[backend.js] Codespace detected, using BACKEND:", url);
    return url;
  }

  if (hostname === "localhost" || hostname === "127.0.0.1") {
    const url = `${protocol}//${hostname}:${backendPort}`;
    console.log("[backend.js] Local dev, using BACKEND:", url);
    return url;
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
    // si localStorage no está disponible (SSR o tests), devolver only extra
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

  // combinar headers: authHeaders < options.headers
  const combinedHeaders = { ...(authHeaders()), ...(options.headers || {}) };
  const finalOptions = { ...options, headers: combinedHeaders };

  console.log("[authFetch] ", finalOptions.method || "GET", url, finalOptions);

  return fetch(url, finalOptions);
}