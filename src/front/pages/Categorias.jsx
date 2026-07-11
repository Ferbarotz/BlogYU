// src/front/pages/Categorias.jsx
import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { API_BASE } from "../api/backend";
import { mergeCategoryData, CATEGORIES, getCategoryMeta } from "../utils/categories";

const Categorias = () => {
  const navigate = useNavigate();
  const [categorias, setCategorias] = useState(CATEGORIES);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCategorias = async () => {
      try {
        const [categoriesRes, postsRes] = await Promise.all([
          fetch(`${API_BASE}/api/categories`),
          fetch(`${API_BASE}/api/posts`)
        ]);

        const apiCategories = categoriesRes.ok ? await categoriesRes.json() : [];
        const posts = postsRes.ok ? await postsRes.json() : [];

        const postsByCategory = Array.isArray(posts)
          ? posts.reduce((acc, post) => {
              const id = (post?.category || "").toString().trim().toLowerCase();
              if (!id) return acc;
              acc[id] = (acc[id] || 0) + 1;
              return acc;
            }, {})
          : {};

        const merged = mergeCategoryData(apiCategories).map((cat) => ({
          ...cat,
          post_count: Number(cat.post_count ?? postsByCategory[cat.id] ?? 0)
        }));

        setCategorias(merged);
      } catch (error) {
        console.error("Error cargando categorías:", error);
        setCategorias(CATEGORIES);
      } finally {
        setLoading(false);
      }
    };

    fetchCategorias();
  }, []);

  const totalPosts = useMemo(
    () => categorias.reduce((acc, cat) => acc + Number(cat.post_count || 0), 0),
    [categorias]
  );

  const handleCategoryClick = (catId) => {
    navigate(`/?category=${catId}`);
  };

  if (loading) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border text-primary"></div>
      </div>
    );
  }

  return (
    <div className="container py-5">
      <div className="text-center mb-5">
        <h1 className="fw-bold text-white">Explorar por Categoría</h1>
        <p className="text-light-emphasis mb-2">
          Encuentra recomendaciones filtradas por tipo de plan.
        </p>
        <small className="text-secondary">
          {categorias.length} categorías · {totalPosts} publicaciones
        </small>
      </div>

      <div className="row g-4">
        {categorias.map((cat) => {
          const meta = getCategoryMeta(cat.id);
          const color = cat.color || meta.color;
          return (
            <div className="col-12 col-sm-6 col-lg-4" key={cat.id}>
              <button
                type="button"
                className="category-card w-100 h-100 text-start border-0"
                onClick={() => handleCategoryClick(cat.id)}
                style={{
                  background: `linear-gradient(145deg, ${color}22 0%, #101318 100%)`,
                  border: `1px solid ${color}66`,
                  borderRadius: "18px",
                  padding: "20px",
                  minHeight: "210px",
                  cursor: "pointer"
                }}
              >
                <div className="d-flex justify-content-between align-items-start mb-3">
                  <span
                    className="d-inline-flex align-items-center justify-content-center rounded-circle"
                    style={{
                      width: "56px",
                      height: "56px",
                      backgroundColor: color,
                      color: "#fff",
                      fontSize: "1.35rem",
                      boxShadow: `0 10px 24px ${color}66`
                    }}
                  >
                    <i className={`bi ${cat.icon || meta.icon || "bi-tag"}`}></i>
                  </span>

                  <span
                    className="badge rounded-pill"
                    style={{ background: `${color}33`, color: "#fff" }}
                  >
                    {Number(cat.post_count || 0)} posts
                  </span>
                </div>

                <h4 className="fw-bold text-white mb-2">{cat.name || meta.name}</h4>
                <p className="mb-3" style={{ color: "rgba(255,255,255,0.72)", fontSize: "0.95rem" }}>
                  {cat.description || meta.description}
                </p>

                <div className="d-inline-flex align-items-center gap-2" style={{ color }}>
                  <span className="fw-semibold">Ver publicaciones</span>
                  <i className="bi bi-arrow-right-circle" />
                </div>
              </button>
            </div>
          );
        })}
      </div>

      <style>{`
        body { background: #0d1117 !important; }
        .category-card {
          transition: transform 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease;
        }
        .category-card:hover {
          transform: translateY(-10px) scale(1.01);
          box-shadow: 0 24px 35px rgba(0, 0, 0, 0.35);
        }
        @media (max-width: 768px) {
          .category-card { min-height: 185px !important; padding: 16px !important; }
        }
      `}</style>
    </div>
  );
};

export default Categorias;
