import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import PostCard from "../components/PostCard";
import { API_BASE } from "../api/backend";

const Posts = () => {
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchPosts = async () => {
            try {
                const res = await fetch(`${API_BASE}/api/posts`);
                const data = await res.json();
                if (res.ok) {
                    setPosts(Array.isArray(data) ? data : data.posts || []);
                }
            } catch (error) {
                console.error("Error cargando posts:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchPosts();
    }, []);

    if (loading) return <div className="text-center py-5">Cargando publicaciones...</div>;

    return (
        <div className="container-fluid py-5" style={{ maxWidth: "1400px" }}>
            <div className="text-center mb-5">
                <h2 className="fw-bold display-6">Últimas Publicaciones</h2>
                <p className="text-muted">Explora el contenido de nuestra comunidad.</p>
            </div>

            {posts.length === 0 ? (
                <div className="text-center py-5">
                    <p className="text-muted">No hay publicaciones todavía.</p>
                </div>
            ) : (
                /* 
                   Este Grid obliga a:
                   - En PC: 4 columnas (si hay espacio)
                   - En Tablet: 2 columnas
                   - En Celular: 1 columna
                */
                <div style={{ 
                    display: "grid", 
                    gridTemplateColumns: "1fr 1fr 1fr 1fr", 
                    gap: "20px",
                    padding: "0 20px",
                    backgroundColor: "red"
                }}>
                    {posts.map((post) => {
                        let img = post.image;
                        if (img && img.startsWith("/")) img = `${API_BASE}${img}`;

                        return (
                            <PostCard
                                key={post.id}
                                title={post.title}
                                content={post.content}
                                image={img}
                                date={post.created_at ? new Date(post.created_at).toLocaleDateString() : ""}
                                onReadMore={() => navigate(`/posts/${post.id}`)}
                            />
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default Posts;