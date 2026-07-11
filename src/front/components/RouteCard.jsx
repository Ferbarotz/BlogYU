// src/front/components/RouteCard.jsx
import React from "react";
import { API_BASE } from "../api/backend";
import MediaCard from "./MediaCard";

const ACCENT = "#f9d423";
const ACCENT_GRADIENT = "linear-gradient(135deg, #f9d423 0%, #ff4e50 100%)";

// ── Helpers de URL ──
const makeAbsolute = (url) => {
  if (!url || typeof url !== "string") return null;
  const trimmed = url.trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (trimmed.startsWith("//")) return `https:${trimmed}`;
  if (trimmed.startsWith("/")) {
    const base = (API_BASE && API_BASE !== "") ? API_BASE.replace(/\/$/, "") : window.location.origin.replace(/\/$/, "");
    return `${base}${trimmed}`;
  }
  try {
    return new URL(trimmed, window.location.origin).href;
  } catch (e) {
    return trimmed;
  }
};

const extractUrl = (img) => {
  if (!img) return null;
  if (typeof img === "string") return img;
  if (typeof img === "object") {
    return img.url || img.src || img.path || img.file || (img.image && (img.image.url || img.image.path)) || null;
  }
  return null;
};

const getAuthor = (r = {}) => {
  const source = r.user || r.author || r.created_by || (r.user_name ? { name: r.user_name } : null) || null;
  const name =
    (source && (source.name || source.username)) ||
    r.user_name || r.author_name || r.username ||
    (typeof r.author === "string" ? r.author : null) ||
    "Anónimo";
  const avatar = (source && (source.avatar || source.picture || source.photo || source.profile_pic)) || r.user_avatar || r.avatar || null;
  const id = (source && (source.id || source._id)) || null;
  return { name, avatar, id };
};

const RouteCard = ({ route = {}, onView, onEdit, onDelete, showActions = false }) => {
  // Recolecta imágenes desde distintos campos y steps de la ruta
  const collectRawImages = () => {
    const arr = [];
    if (Array.isArray(route.images)) arr.push(...route.images);
    if (Array.isArray(route.photos)) arr.push(...route.photos);
    if (route.image) arr.push(route.image);
    if (route.photo) arr.push(route.photo);
    (route.steps || []).forEach((s) => {
      if (s && Array.isArray(s.images)) arr.push(...s.images);
      if (s && Array.isArray(s.photos)) arr.push(...s.photos);
      if (s && s.image) arr.push(s.image);
      if (s && s.photo) arr.push(s.photo);
      if (s && Array.isArray(s.media)) arr.push(...s.media);
    });
    return arr;
  };

  const photos = (() => {
    const raw = collectRawImages().map(extractUrl).filter(Boolean).map(makeAbsolute);
    const seen = new Set();
    const unique = [];
    for (const u of raw) {
      if (u && !seen.has(u)) { seen.add(u); unique.push(u); }
    }
    return unique;
  })();

  const date = route.created_at ? new Date(route.created_at).toLocaleDateString() : "";
  const { name, avatar, id } = getAuthor(route || {});
  const author = { name, avatar: makeAbsolute(extractUrl(avatar)), id };

  return (
    <MediaCard
      accent={ACCENT}
      accentGradient={ACCENT_GRADIENT}
      categoryIcon="🗺️"
      categoryLabel="Ruta"
      photos={photos}
      title={route.title}
      date={date}
      location={route.destination || ""}
      author={author}
      onView={onView}
      onEdit={onEdit}
      onDelete={onDelete}
      showActions={showActions}
    />
  );
};

export default RouteCard;
