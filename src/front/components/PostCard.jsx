// src/front/components/PostCard.jsx
import React, { useEffect, useMemo, useState } from "react";
import { API_BASE, authHeaders } from "../api/backend";
import MediaCard from "./MediaCard";

const ACCENT = "#00f2fe";
const ACCENT_GRADIENT = "linear-gradient(135deg, #00f2fe 0%, #4facfe 100%)";

const CATEGORY_ICONS = {
  hoteles: "🏨", restaurantes: "🍽️", bares: "🍹",
  lugares: "📍", cultura: "🎭", otros: "✨",
};

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

  const [likeCount, setLikeCount] = useState(Number(post?.like_count || 0));
  const [likedByMe, setLikedByMe] = useState(Boolean(post?.liked_by_me));
  const [liking, setLiking] = useState(false);

  useEffect(() => {
    setLikeCount(Number(post?.like_count || 0));
    setLikedByMe(Boolean(post?.liked_by_me));
  }, [post?.id, post?.like_count, post?.liked_by_me]);

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

  const meta = useMemo(() => {
    const views = Number(post?.views || 0);
    const reading = Number(post?.reading_time_minutes || 1);
    return { views, reading };
  }, [post?.views, post?.reading_time_minutes]);

  const handleLike = async () => {
    if (!post?.id || liking) return;
    const token = localStorage.getItem("token");
    if (!token) {
      alert("Inicia sesión para dar like.");
      return;
    }

    setLiking(true);
    try {
      const res = await fetch(`${API_BASE}/api/posts/${post.id}/like`, {
        method: "POST",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.msg || `HTTP ${res.status}`);
      }
      const data = await res.json();
      setLikeCount(Number(data.likes_count || 0));
      setLikedByMe(Boolean(data.liked_by_me));
    } catch (err) {
      console.error("Error al dar like:", err);
    } finally {
      setLiking(false);
    }
  };

  return (
    <div>
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

      <div
        className="mt-2 d-flex justify-content-between align-items-center px-2"
        style={{ color: "rgba(255,255,255,0.7)", fontSize: "0.82rem" }}
      >
        <div className="d-flex gap-3">
          <span>👁️ {meta.views}</span>
          <span>⏱️ {meta.reading} min</span>
        </div>
        <button
          type="button"
          onClick={handleLike}
          disabled={liking}
          style={{
            background: likedByMe ? "rgba(249,212,35,0.18)" : "rgba(255,255,255,0.06)",
            color: likedByMe ? "#f9d423" : "#fff",
            border: likedByMe ? "1px solid rgba(249,212,35,0.45)" : "1px solid rgba(255,255,255,0.14)",
            borderRadius: "999px",
            padding: "4px 10px",
            fontSize: "0.78rem",
            cursor: liking ? "not-allowed" : "pointer",
          }}
          title={likedByMe ? "Quitar like" : "Dar like"}
        >
          {likedByMe ? "💛" : "🤍"} {likeCount}
        </button>
      </div>
    </div>
  );
};

export default PostCard;
