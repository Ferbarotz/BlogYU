// src/front/utils/imageCompression.js
import imageCompression from "browser-image-compression";

const MIME_TO_EXT = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};
const VALID_EXT = new Set(["jpg", "jpeg", "png", "webp", "gif"]);

/**
 * Devuelve un nombre con extensión coherente con el tipo MIME.
 * Si el nombre no tiene extensión válida, la deriva de `type`.
 */
function ensureFileName(name, type, fallback = "foto") {
  const base = (name || "").trim() || fallback;
  const dot = base.lastIndexOf(".");
  const ext = dot > 0 ? base.slice(dot + 1).toLowerCase() : "";
  const derived = MIME_TO_EXT[(type || "").toLowerCase()];
  if (!derived) return base;
  const stem = dot > 0 ? base.slice(0, dot) : base;
  if (!VALID_EXT.has(ext)) return `${stem}.${derived}`;
  // Si la extensión no coincide con el tipo real (p. ej. .png comprimido a jpeg), corregirla
  const extNorm = ext === "jpeg" ? "jpg" : ext;
  return extNorm === derived ? base : `${stem}.${derived}`;
}

/**
 * Comprime una imagen y SIEMPRE devuelve un File con nombre y extensión.
 * browser-image-compression puede devolver un Blob sin nombre, que llega
 * al backend como "blob" y se rechaza por no tener extensión.
 * @param {File} file Archivo imagen original
 * @param {Object} options Opciones de compresión (opcional)
 * @returns {Promise<File>} Archivo comprimido o el original si falla
 */
export async function compressImage(file, options = {}) {
  const defaultOptions = {
    maxSizeMB: 1,
    maxWidthOrHeight: 1920,
    useWebWorker: true,
  };
  try {
    const compressed = await imageCompression(file, { ...defaultOptions, ...options });
    const type = compressed.type || file.type || "image/jpeg";
    const name = ensureFileName(file.name, type);
    return new File([compressed], name, { type, lastModified: Date.now() });
  } catch (error) {
    console.warn("Error comprimiendo imagen, se usará original", error);
    return file;
  }
}
