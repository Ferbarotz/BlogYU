// src/front/pages/PostDetail.jsx
import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { API_BASE } from "../api/backend";

const PostDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [post, setPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [loading, setLoading] = useState(true);
  const [activeImg, setActiveImg] = useState(0);

  const user = JSON.parse(localStorage.getItem("user") || "null");

  const getImages = (data) => {
    if (!data) return [];

    const clean = (url) => {
      if (!url || typeof url !== "string") return null;
      if (url.startsWith("/")) return `${API_BASE}${url}`;
      if (url.includes("localhost")) return `${API_BASE}${new URL(url).pathname}`;
      return url;
    };

    if (data.images && Array.isArray(data.images) && data.images.length > 0) {
      return data.images
        .sort((a, b) => a.order - b.order)
        .map(img => clean(img.url))
        .filter(Boolean);
    }

    if (data.image) {
      const raw = data.image;
      return (Array.isArray(raw) ? raw : [raw]).map(clean).filter(Boolean);
    }

    return [];
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [pRes, cRes] = await Promise.all([
          fetch(`${API_BASE}/api/posts/${id}`),
          fetch(`${API_BASE}/api/posts/${id}/comments`)
        ]);
        if (pRes.ok) setPost(await pRes.json());
        if (cRes.ok) setComments(await cRes.json());
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    };
    fetchData();
  }, [id]);

  const handleSendComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    try {
      const res = await fetch(`${API_BASE}/api/posts/${id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: newComment, author_name: user?.name || "Invitado", user_id: user?.id })
      });
      if (res.ok) {
        setComments([...comments, await res.json()]);
        setNewComment("");
      }
    } catch (err) { console.error(err); }
  };

  if (loading) return <div style={{background:"#0d1117", minHeight:"100vh", color:"#00f2fe", display:"flex", alignItems:"center", justifyContent:"center"}}>Cargando...</div>;
  if (!post) return <div style={{background:"#0d1117", minHeight:"100vh", color:"#fff", textAlign:"center", padding:"50px"}}>Post no encontrado</div>;

  const images = getImages(post);

  return (
    <div style={{ background: "#0d1117", minHeight: "100vh", color: "#fff" }}>
      <div style={{ background: "linear-gradient(135deg, #0f2027, #2c5364)", padding: "60px 20px", textAlign: "center", borderBottom: "1px solid #00f2fe" }}>
        <h1 style={{ fontWeight: 900, fontSize: "2.5rem" }}>{post.title}</h1>
        <p style={{ color: "#00f2fe" }}>{post.category} • {new Date(post.created_at).toLocaleDateString()}</p>
      </div>

      <div className="container py-5" style={{ maxWidth: "800px" }}>
        <button onClick={() => navigate(-1)} className="btn btn-sm btn-outline-info mb-4">← Volver</button>

        {images.length > 0 && (
          <div className="mb-4">
            <img src={images[activeImg]} className="img-fluid rounded shadow w-100" style={{ maxHeight: "450px", objectFit: "cover" }} alt="" />
            <div className="d-flex gap-2 mt-2 overflow-auto">
              {images.map((img, i) => (
                <img key={i} src={img} onClick={() => setActiveImg(i)} style={{ width: "80px", height: "60px", objectFit: "cover", cursor: "pointer", border: activeImg === i ? "2px solid #00f2fe" : "none", borderRadius: "4px" }} alt="" />
              ))}
            </div>
          </div>
        )}

        <div style={{ background: "rgba(255,255,255,0.05)", padding: "30px", borderRadius: "15px", lineHeight: "1.8", fontSize: "1.1rem" }}>
          {post.content}
        </div>

        <div className="mt-5">
          <h4>Comentarios ({comments.length})</h4>
          {comments.map(c => (
            <div key={c.id} className="p-3 mb-2 rounded" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.1)" }}>
              <div className="d-flex justify-content-between"><strong style={{ color: "#00f2fe" }}>{c.author_name}</strong><small>{c.created_at}</small></div>
              <p className="mb-0 mt-1">{c.content}</p>
            </div>
          ))}

          <form onSubmit={handleSendComment} className="mt-4 p-4 rounded" style={{ background: "rgba(255,255,255,0.05)" }}>
            <h5>Deja tu opinión</h5>
            <textarea className="form-control bg-dark text-white border-secondary mb-3" rows="3" value={newComment} onChange={e => setNewComment(e.target.value)} placeholder="Escribe aquí..." required />
            <button className="btn btn-info w-100 fw-bold">Publicar Comentario</button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default PostDetail;