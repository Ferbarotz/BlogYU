// src/index.js
import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import "bootstrap/dist/css/bootstrap.min.css";

import Navbar from './front/components/Navbar';
import Home from './front/pages/Home';
import Login from './front/pages/Login';
import ForgotPassword from './front/pages/ForgotPassword';
import ResetPassword from './front/pages/ResetPassword';
import Register from './front/pages/Register';
import Profile from "./front/pages/Profile";
import Posts from "./front/pages/Posts";
import NewPost from "./front/pages/NewPost";
import MyPosts from "./front/pages/MyPosts";
import EditPost from "./front/pages/EditPost";
import PostDetail from "./front/pages/PostDetail";
import Categorias from "./front/pages/Categorias";
import CreateRoute from './front/pages/CreateRoute';
import MyRoutes from './front/pages/MyRoutes';
import RouteDetail from './front/pages/RouteDetail';
import EditRoute from "./front/pages/EditRoute";
import AdminDashboard from "./front/pages/AdminDashboard";

// FIX para iconos de Leaflet (debe ejecutarse antes de usar MapContainer/Marker)
import L from 'leaflet';
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png';
import iconShadowUrl from 'leaflet/dist/images/marker-shadow.png';

// Eliminar la referencia interna y proveer rutas de iconos
delete L.Icon.Default.prototype._getIconUrl;

L.Icon.Default.mergeOptions({
  iconRetinaUrl,
  iconUrl,
  shadowUrl: iconShadowUrl,
});

const App = () => {
  // Si quieres redirigir /profile al perfil del usuario actual:
  const currentUser = JSON.parse(localStorage.getItem("user") || "null");
  const currentUserId = currentUser?.id || "";

  return (
    <BrowserRouter>
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/register" element={<Register />} />

        {/* Perfil con id dinámico */}
        <Route path="/profile/:id" element={<Profile />} />

        {/* Redirigir /profile sin id al perfil actual (opcional) */}
        <Route path="/profile" element={<Navigate to={currentUserId ? `/profile/${currentUserId}` : '/login'} replace />} />

        <Route path="/posts" element={<Posts />} />
        <Route path="/new-post" element={<NewPost />} />
        <Route path="/my-posts" element={<MyPosts />} />
        <Route path="/posts/:id/edit" element={<EditPost />} />
        <Route path="/posts/:id" element={<PostDetail />} />
        <Route path="/edit-post/:id" element={<EditPost />} />
        <Route path="/categorias" element={<Categorias />} />
        <Route path="/create-route" element={<CreateRoute />} />
        <Route path="/my-routes" element={<MyRoutes />} />
        <Route path="/route/:id" element={<RouteDetail />} />
        <Route path="/edit-route/:id" element={<EditRoute />} />
        <Route path="/admin" element={<AdminDashboard />} />

        {/* 404 opcional: redirige a home */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

const root = createRoot(document.getElementById('root'));
root.render(<App />);