// src/front/routes.jsx
import React, { Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";

import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Posts from "./pages/Posts";
import PostDetail from "./pages/PostDetail";
import MyPosts from "./pages/MyPosts";
import CreateRoute from "./pages/CreateRoute";
import RouteDetail from "./pages/RouteDetail";
import Categorias from "./pages/Categorias";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Profile from "./pages/Profile";
import NewPost from "./pages/NewPost";
import EditPost from "./pages/EditPost";
import MyRoutes from "./pages/MyRoutes";
import EditRoute from "./pages/EditRoute";
import AdminDashboard from "./pages/AdminDashboard";

import ProtectedRoute from "./components/ProtectedRoute";

export default function AppRoutes() {
  return (
    <Suspense fallback={<div>Cargando...</div>}>
      <Routes>

        {/* Admin (protegido) */}
        <Route path="/admin" element={<ProtectedRoute adminOnly><AdminDashboard /></ProtectedRoute>} />

        {/* Públicas */}
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password/:token" element={<ResetPassword />} />

        {/* Posts - públicos */}
        <Route path="/posts" element={<Posts />} />
        <Route path="/posts/:id" element={<PostDetail />} />

        {/* Rutas - públicas */}
        <Route path="/create-route" element={<CreateRoute />} />
        <Route path="/route/:id" element={<RouteDetail />} />
        <Route path="/edit-route/:id" element={<EditRoute />} />

        {/* Categorías - pública */}
        <Route path="/categories" element={<Categorias />} />

        {/* Perfil - público */}
        <Route path="/profile/:id" element={<Profile />} />
        <Route path="/profile" element={<Navigate to="/" replace />} />

        {/* Crear / Editar posts (protegidos) */}
        <Route path="/new-post" element={<ProtectedRoute><NewPost /></ProtectedRoute>} />
        <Route path="/edit-post/:id" element={<ProtectedRoute><EditPost /></ProtectedRoute>} />

        {/* Mis posts / rutas (protegidos) */}
        <Route path="/my-posts" element={<ProtectedRoute><MyPosts /></ProtectedRoute>} />
        <Route path="/my-routes" element={<ProtectedRoute><MyRoutes /></ProtectedRoute>} />

        {/* 404 */}
        <Route path="*" element={<Navigate to="/" replace />} />

      </Routes>
    </Suspense>
  );
}