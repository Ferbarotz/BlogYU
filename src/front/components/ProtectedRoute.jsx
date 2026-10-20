import React from "react";
import { Navigate } from "react-router-dom";
import { useStore } from "../store";

/**
 * Protege rutas que requieren autenticación.
 * Con `adminOnly`, además exige que el usuario sea admin (user.is_admin).
 * Lee el estado desde el store global (Context), no de localStorage directamente.
 */
export default function ProtectedRoute({ children, adminOnly = false }) {
  const { token, user } = useStore();

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  const isAdmin = !!(user && (user.is_admin || user.role === "admin" || user.role === "superuser"));

  if (adminOnly && !isAdmin) {
    return <Navigate to="/" replace />;
  }

  return children;
}
