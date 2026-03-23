// src/front/api/backend.js
export const API_BASE = "https://super-duper-engine-7vw7gxv9w9xvf9j5-5000.app.github.dev"; // Ajusta si cambia

export function authHeaders() {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}