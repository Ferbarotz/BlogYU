import React from "react";
import { Navigate } from "react-router-dom";

/**
 * Ejemplo simple: comprueba si hay token en localStorage.
 * Adapta la comprobación al método de autenticación real (context, redux, cookie, etc).
 */
export default function ProtectedRoute({ children , adminOnly = false }) {
  const token = localStorage.getItem("auth_token") || localStorage.getItem("token");
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return children;
}