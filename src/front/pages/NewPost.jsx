import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";

const API_BASE = "https://miniature-winner-69wvjp9g5q673x6jp-5000.app.github.dev";

// Extensiones permitidas en el cliente (para validación previa)
const ALLOWED_CLIENT_EXT = ['png', 'jpg', 'jpeg', 'gif', 'webp'];

const NewPost = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ title: "", content: "" });
  const [imageFile, setImageFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const token = localStorage.getItem("token");

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validar mimetype
    if (!file.type.startsWith("image/")) {
      alert("Por favor selecciona un archivo de imagen.");
      return;
    }

    // Validar tamaño (5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert("La imagen es muy grande (máx 5MB).");
      return;
    }

    // Validar extensión por si el backend lo necesita
    const ext = (file.name.split('.').pop() || '').toLowerCase();
    if (!ALLOWED_CLIENT_EXT.includes(ext)) {
      alert("Formato no soportado en el cliente. Usa: " + ALLOWED_CLIENT_EXT.join(', '));
      return;
    }

    setImageFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title || !formData.content) {
      alert("Completa título y contenido.");
      return;
    }
    if (!token) {
      alert("Debes iniciar sesión para crear publicaciones.");
      navigate("/login");
      return;
    }

    setLoading(true);
    try {
      const fd = new FormData();
      fd.append("title", formData.title);
      fd.append("content", formData.content);
      if (imageFile) fd.append("image", imageFile);

      console.log("Enviando a:", `${API_BASE}/api/posts`); // depuración
      const res = await fetch(`${API_BASE}/api/posts`, {
        method: "POST",
        headers: {
          // NO poner Content-Type: multipart/form-data aquí — el navegador lo pone automáticamente
          "Authorization": `Bearer ${token}`
        },
        body: fd
      });

      const data = await res.json();

      if (res.ok) {
        // Redirigir a la lista de posts o al post creado
        navigate("/posts");
      } else {
        alert("Error creando post: " + (data.msg || JSON.stringify(data)));
      }
    } catch (err) {
      console.error(err);
      alert("Error de conexión con el servidor.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 py-10 px-4">
      <div className="max-w-2xl mx-auto bg-white p-8 rounded-lg shadow-md">
        <Link to="/posts" className="text-indigo-600 hover:underline mb-4 inline-block">
          ← Volver a Publicaciones
        </Link>

        <h2 className="text-3xl font-bold mb-6 text-gray-800">Crear Nueva Publicación</h2>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700">Título</label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              className="w-full p-3 border rounded-md focus:ring-2 focus:ring-indigo-500 outline-none"
              placeholder="Escribe un título llamativo"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Contenido</label>
            <textarea
              name="content"
              value={formData.content}
              onChange={handleChange}
              rows="6"
              className="w-full p-3 border rounded-md focus:ring-2 focus:ring-indigo-500 outline-none"
              placeholder="Escribe el contenido de tu publicación"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Imagen (opcional)</label>

            {/* INPUT: acepta todos los tipos de imagen en el cliente */}
            <input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="block w-full text-sm text-gray-700"
            />

            {previewUrl && (
              <div className="mt-3">
                <p className="text-sm text-gray-600 mb-2">Previsualización:</p>
                <img src={previewUrl} alt="preview" className="max-h-64 object-contain rounded shadow-sm" />
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full py-3 rounded-md font-bold text-white ${loading ? "bg-gray-400" : "bg-indigo-600 hover:bg-indigo-700"}`}
          >
            {loading ? "Publicando..." : "Publicar ahora"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default NewPost;