// src/index.js
import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import "bootstrap/dist/css/bootstrap.min.css";

import Navbar from './front/components/Navbar';
import Home from './front/pages/Home';
import Login from './front/pages/Login';
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

const App = () => (
  <BrowserRouter>
    <Navbar />
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/profile" element={<Profile />} />
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
    </Routes>
  </BrowserRouter>
);

const root = createRoot(document.getElementById('root'));
root.render(<App />);