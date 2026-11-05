// Configuración centralizada de fondos de página.
//
// Estado actual: NO hay imágenes de fondo estáticas en el frontend. Los fondos
// de Inicio y Perfil son dinámicos y vienen de la API:
//   - Fondo global de Inicio: GET /api/settings/home-background (lo cambia un admin).
//   - Fondo de perfil: campo user.background.
// Ambos endpoints de subida guardan ya la imagen en Cloudinary (carpeta blogyu/backgrounds).
//
// Migración de fondos antiguos: si el fondo de Inicio se subió antes de este cambio,
// su URL es /api/uploads/... (disco local de Render, que se borra en cada deploy).
// Vuelve a subirlo desde el panel de admin en Inicio o pega aquí una URL de Cloudinary:
//   1. Sube la imagen en https://console.cloudinary.com (carpeta blogyu/backgrounds).
//   2. Copia la "Secure URL" (https://res.cloudinary.com/<cloud>/image/upload/...).
//   3. Pégala en DEFAULT_HOME_BG_URL.

// Fondo de Inicio usado cuando la API no devuelve ninguno. Vacío = usar degradado.
export const DEFAULT_HOME_BG_URL = "";

// Capa oscura sobre la imagen del hero para mantener el texto legible.
export const HERO_OVERLAY = "linear-gradient(rgba(0,0,0,0.55), rgba(0,0,0,0.55))";

// Degradado de respaldo cuando no hay ninguna imagen.
export const FALLBACK_HERO_GRADIENT = "linear-gradient(135deg, #0f2027 0%, #203a43 50%, #2c5364 100%)";
