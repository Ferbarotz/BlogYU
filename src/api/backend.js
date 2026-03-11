// src/front/api/backend.js
export const API_BASE = "https://miniature-winner-69wvjp9g5q673x6jp-5000.app.github.dev";

export function authHeaders() {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}