// src/front/constants/categories.js
// Fuente única de verdad para las categorías de posts.
// Usada al crear (NewPost), editar (EditPost) y filtrar (MyPosts) posts.
// Los `id` deben coincidir con lo que se guarda en el backend.

export const POST_CATEGORIES = [
  { id: "hoteles",      name: "🏨 Hoteles" },
  { id: "restaurantes", name: "🍽️ Restaurantes" },
  { id: "bares",        name: "🍹 Bares" },
  { id: "lugares",      name: "📍 Lugares / Sitios" },
  { id: "cultura",      name: "🏛️ Cultura / Museos" },
  { id: "otros",        name: "✨ Otros" },
];

// Igual que POST_CATEGORIES pero con la opción "todos" al principio (para filtros).
export const FILTER_CATEGORIES = [
  { id: "todos", name: "🌍 Todos" },
  ...POST_CATEGORIES,
];

// Normaliza un valor de categoría (string u objeto) a su id en minúsculas.
export const normalizeCategory = (cat) => {
  if (!cat) return "";
  if (typeof cat === "string") return cat.trim().toLowerCase();
  if (typeof cat === "object") return (cat.id || cat.name || "").toString().trim().toLowerCase();
  return "";
};
