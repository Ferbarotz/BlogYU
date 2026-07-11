// src/front/components/PostCard.jsx
import React from "react";
import { API_BASE } from "../api/backend";
import MediaCard from "./MediaCard";

const ACCENT = "#00f2fe";
const ACCENT_GRADIENT = "linear-gradient(135deg, #00f2fe 0%, #4facfe 100%)";

const CATEGORY_ICONS = {
  hoteles: "🏨", restaurantes: "🍽️", bares: "🍹",
  lugares: "📍", cultura: "🎭", otros: "✨",
};

// Helper para extraer autor de un post
const getAuthor = (p = {}) => {
  const source = p.user || p.author || p.created_by || (p.user_name ? { name: p.user_name } : null) || null;
  const name =
    (source && (source.name || source.username)) ||
    p.user_name || p.author_name || p.username ||
    (typeof p.author === "string" ? p.author : null) ||
    "Anónimo";
  const avatar = (source && (source.avatar || source.picture || source.photo || source.profile_pic)) || p.user_avatar || p.avatar || null;
  const id = (source && (source.id || source._id)) || null;
  return { name, avatar, id };
};

const normalizeUrl = (url) => {
  if (!url || typeof url !== "string") return null;
  if (url.startsWith("/")) return `${API_BASE}${url}`;
  return url;
};

const PostCard = ({
  title, content, image, images, date, category, onReadMore,
  post,
  onEdit, onDelete, onView,
  showActions = false,
  showAuthor = true,
}) => {
  const _title = post?.title ?? title;
  const _image = post?.image ?? image;
  const _images = post?.images ?? images;
  const _date = post?.created_at ? new Date(post.created_at).toLocaleDateString() : (date ?? "");
  const _category = post?.category ?? category;

  // Recolectar fotos (misma lógica de antes)
  const getPhotos = () => {
    if (_images && Array.isArray(_images) && _images.length > 0) {
      return _images
        .slice()
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
        .map((img) => normalizeUrl(typeof img === "object" ? img.url : img))
        .filter(Boolean);
    }
    if (_image) {
      const raw = Array.isArray(_image) ? _image : [_image];
      return raw
        .map((img) => normalizeUrl(typeof img === "object" ? (img.url || img.path) : img))
        .filter(Boolean);
    }
    return [];
  };

  const photos = getPhotos();
  const cat = _category ? _category.toString().trim().toLowerCase() : "";
  const categoryLabel = _category || "General";
  const categoryIcon = CATEGORY_ICONS[cat] || "📍";

  const { name, avatar, id } = getAuthor(post || {});
  const author = { name, avatar: normalizeUrl(avatar), id };

  return (
    <MediaCard
      accent={ACCENT}
      accentGradient={ACCENT_GRADIENT}
      categoryIcon={categoryIcon}
      categoryLabel={categoryLabel}
      photos={photos}
      title={_title}
      date={_date}
      location={post?.location || ""}
      author={author}
      showAuthor={showAuthor}
      onView={onView ?? onReadMore}
      onEdit={onEdit}
      onDelete={onDelete}
      showActions={showActions}
    />
  );
};

export default PostCard;
