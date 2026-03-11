import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { API_BASE, authHeaders } from "../api/backend";

const EditPost = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({ title: "", content: "" });
  const [imageFile, setImageFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPost = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/posts/${id}`);
        const data = await res.json();
        if (res.ok) {
          setFormData({ title: data.title, content: data.content });
          setPreviewUrl(data.image || null);
        } else {
          alert("No se encontró el post");
          navigate("/my-posts");
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchPost();
  }, [id, navigate]);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { alert("Selecciona una imagen"); return; }
    setImageFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append("title", formData.title);
      fd.append("content", formData.content);
      if (imageFile) fd.append("image", imageFile);

      const res = await fetch(`${API_BASE}/api/posts/${id}`, {
        method: "PUT",
        headers: { ...authHeaders() },
        body: fd
      });

      const data = await res.json();
      if (res.ok) {
        navigate("/my-posts");
      } else {
        alert(data.msg || "Error actualizando");
      }
    } catch (err) {
      console.error(err);
      alert("Error de conexión");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-10 px-4">
      <h1 className="text-2xl font-bold mb-6">Editar Publicación</h1>
      <form onSubmit={handleSubmit} className="space-y-6 bg-white p-6 rounded shadow">
        <input name="title" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} required />
        <textarea name="content" value={formData.content} onChange={e => setFormData({...formData, content: e.target.value})} required />
        <input type="file" accept="image/*" onChange={handleFileChange} />
        {previewUrl && <img src={previewUrl} alt="preview" className="max-h-48" />}
        <button type="submit" className="bg-indigo-600 text-white px-4 py-2 rounded">Guardar cambios</button>
      </form>
    </div>
  );
};

export default EditPost;