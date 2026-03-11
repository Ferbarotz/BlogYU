import React, { useState, useEffect } from "react";
import PostCard from "../components/PostCard";

const API_BASE = "https://miniature-winner-69wvjp9g5q673x6jp-5000.app.github.dev";

const Home = () => {
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchPosts = async () => {
            try {
                const res = await fetch(`${API_BASE}/api/posts`);
                const data = await res.json();
                if (res.ok) {
                    // Guardamos los posts reales que vienen de la base de datos
                    setPosts(data);
                }
            } catch (error) {
                console.error("Error cargando posts en el inicio:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchPosts();
    }, []);

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Hero Section */}
            <div className="bg-indigo-700 py-16">
                <div className="max-w-7xl mx-auto px-4 text-center">
                    <h1 className="text-5xl font-extrabold text-white mb-4">
                        Bienvenido a BlogYU
                    </h1>
                    <p className="text-xl text-indigo-100">
                        Descubre las historias y publicaciones de nuestra comunidad.
                    </p>
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-7xl mx-auto px-4 py-12">
                <h2 className="text-3xl font-bold text-gray-900 mb-8 border-b pb-4">
                    Últimas Publicaciones
                </h2>

                {loading ? (
                    <div className="flex justify-center items-center h-64">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-700"></div>
                        <span className="ml-3 text-gray-600">Cargando posts...</span>
                    </div>
                ) : posts.length === 0 ? (
                    <div className="text-center py-20 bg-white rounded-lg shadow">
                        <p className="text-xl text-gray-500">No hay publicaciones todavía.</p>
                        <p className="text-gray-400 mt-2">¡Sé el primero en crear una!</p>
                    </div>
                ) : (
                    <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
                        {posts.map((post) => (
                            <PostCard
                                key={post.id}
                                title={post.title}
                                content={post.content}
                                image={post.image} // Aquí pasamos la URL de la imagen que guardamos en Flask
                                date={new Date(post.created_at).toLocaleDateString()}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Home;