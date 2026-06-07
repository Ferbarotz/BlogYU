/**
 * Devuelve la URL base del backend.
 * Prioridad:
 *  1) REACT_APP_BACKEND_URL / BACKEND_URL
 *  2) En producción usa "" para que el frontend llame al mismo dominio
 *  3) En Codespaces / localhost usa "" para aprovechar el proxy de webpack
 *  4) Fallback: http(s)://hostname:5000
 */
export function getBackendURL() {
  const env =
    (typeof process !== "undefined" &&
      process.env &&
      (process.env.REACT_APP_BACKEND_URL || process.env.BACKEND_URL)) ||
    null;

  if (env) return env.replace(/\/$/, "");

  if (
    typeof process !== "undefined" &&
    process.env &&
    process.env.NODE_ENV === "production"
  ) {
    return "";
  }

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
export default API_BASE;

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