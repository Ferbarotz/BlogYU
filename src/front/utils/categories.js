// src/front/utils/categories.js

export const CATEGORIES = [
  {
    id: "hoteles",
    name: "Hoteles",
    icon: "🏨",
    color: "#4f46e5",
    description: "Alojamientos recomendados para cada presupuesto."
  },
  {
    id: "restaurantes",
    name: "Restaurantes",
    icon: "🍽️",
    color: "#ef4444",
    description: "Sabores locales, gourmet y rincones gastronómicos."
  },
  {
    id: "bares",
    name: "Bares",
    icon: "🍺",
    color: "#f59e0b",
    description: "Coctelería, tapas y ambiente para disfrutar de noche."
  },
  {
    id: "lugares",
    name: "Lugares",
    icon: "🗺️",
    color: "#10b981",
    description: "Sitios imprescindibles para visitar y descubrir."
  },
  {
    id: "cultura",
    name: "Cultura",
    icon: "🎭",
    color: "#8b5cf6",
    description: "Museos, historia, arte y planes culturales."
  },
  {
    id: "otros",
    name: "Otros",
    icon: "📍",
    color: "#64748b",
    description: "Recomendaciones variadas fuera de las categorías principales."
  }
];

export const DEFAULT_CATEGORY_META = {
  id: "otros",
  name: "Otros",
  icon: "📍",
  color: "#64748b",
  description: "Descubre más recomendaciones de la comunidad."
};

export const normalizeCategoryId = (value) =>
  (value || "").toString().trim().toLowerCase();

export const getCategoryMeta = (categoryId) => {
  const normalized = normalizeCategoryId(categoryId);
  return CATEGORIES.find((c) => c.id === normalized) || {
    ...DEFAULT_CATEGORY_META,
    id: normalized || DEFAULT_CATEGORY_META.id,
    name: normalized || DEFAULT_CATEGORY_META.name
  };
};

export const mergeCategoryData = (apiCategories = []) => {
  const merged = [...CATEGORIES];

  for (const raw of apiCategories) {
    const cat = typeof raw === "string" ? { id: raw, name: raw } : (raw || {});
    const id = normalizeCategoryId(cat.id || cat.name);
    if (!id) continue;

    const existingIdx = merged.findIndex((c) => c.id === id);
    const existingMeta = existingIdx >= 0 ? merged[existingIdx] : getCategoryMeta(id);

    const normalized = {
      ...existingMeta,
      ...cat,
      id,
      name: cat.name || existingMeta.name,
      icon: cat.icon || existingMeta.icon,
      color: cat.color || existingMeta.color,
      description: cat.description || existingMeta.description,
      post_count: Number(cat.post_count ?? cat.posts_count ?? 0)
    };

    if (existingIdx >= 0) merged[existingIdx] = normalized;
    else merged.push(normalized);
  }

  return merged;
};

export const CATEGORY_FILTER_ALL = {
  id: "todos",
  name: "Todos",
  icon: "bi-globe2",
  color: "#06b6d4",
  description: "Ver todas las categorías"
};

export const getCategoryFilters = (categories = CATEGORIES) => [CATEGORY_FILTER_ALL, ...categories];
