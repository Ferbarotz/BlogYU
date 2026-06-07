export function getBackendURL() {
  const env =
    (typeof process !== "undefined" &&
      process.env &&
      (process.env.REACT_APP_BACKEND_URL || process.env.BACKEND_URL)) ||
    null;

  if (env) return env.replace(/\/$/, "");

  if (typeof window === "undefined") {
    return "http://127.0.0.1:5000";
  }

  const { hostname } = window.location;

  if (
    hostname.includes("app.github.dev") ||
    hostname === "localhost" ||
    hostname === "127.0.0.1"
  ) {
    return "";
  }

  // Produccion (Render, cualquier otro dominio): rutas relativas
  return "";
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

  return fetch(url, finalOptions);
}
