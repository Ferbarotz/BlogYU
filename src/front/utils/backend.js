/**
 * Devuelve la URL base del backend.
 * Prioridad:
 *  1) REACT_APP_BACKEND_URL / BACKEND_URL
 *  2) Si estamos en Codespaces (*.app.github.dev) reemplaza -8080. por -5000.
 *  3) Fallback: http(s)://hostname:5000
 */
export function getBackendURL() {
  const env =
    (typeof process !== "undefined" &&
      process.env &&
      (process.env.REACT_APP_BACKEND_URL || process.env.BACKEND_URL)) ||
    null;

  if (env) return env;

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
    return `https://${replaced}`;
  }

  if (hostname === "localhost" || hostname === "127.0.0.1") {
    return `${protocol}//${hostname}:${backendPort}`;
  }

  return `${protocol}//${hostname}:${backendPort}`;
}

// ✅ Esto es lo que tus componentes están importando
export const API_BASE = getBackendURL();

export default getBackendURL;