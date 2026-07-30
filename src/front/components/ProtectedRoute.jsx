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

  if (adminOnly && !user?.is_admin) {
    return <Navigate to="/" replace />;
  }

  return children;
}
