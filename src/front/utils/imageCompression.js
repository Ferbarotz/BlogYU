// src/front/utils/imageCompression.js
import imageCompression from "browser-image-compression";

/**
 * Comprime una imagen File usando browser-image-compression.
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
    const compressedFile = await imageCompression(file, { ...defaultOptions, ...options });
    return compressedFile;
  } catch (error) {
    console.warn("Error comprimiendo imagen, se usará original", error);
    return file;
  }
}