import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";

const Navbar = () => {
    const navigate = useNavigate();
    const [token, setToken] = useState(localStorage.getItem("token"));
    const [userName, setUserName] = useState("");

    const loadUserData = () => {
        const storedToken = localStorage.getItem("token");
        const storedUser = localStorage.getItem("user");
        setToken(storedToken);
        if (storedUser) {
            const userObj = JSON.parse(storedUser);
            setUserName(userObj.name || "Usuario");
        }
    };

    useEffect(() => {
        loadUserData();
        window.addEventListener("storage", loadUserData);
        return () => window.removeEventListener("storage", loadUserData);
    }, []);

    const handleLogout = () => {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        setToken(null);
        navigate("/login");
    };

    return (
        <nav className="bg-dark p-3 d-flex justify-content-between align-items-center shadow sticky-top">
            <div className="h3 mb-0">
                <Link to="/" className="text-white text-decoration-none font-weight-bold">
                    Blog<span className="text-primary">YU</span>
                </Link>
            </div>

            <div className="d-flex align-items-center">
                {!token ? (
                    <>
                        <Link to="/login" className="btn btn-outline-light me-2">Iniciar Sesión</Link>
                        <Link to="/register" className="btn btn-primary">Crear Usuario</Link>
                    </>
                ) : (
                    <>
                        {/* Botón Perfil - Estilo Sólido */}
                        <Link
                            to="/profile"
                            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 shadow-sm transition-all"
                        >
                            Perfil
                        </Link>
                        {/* Botón Mis Posts - Estilo Esquema/Borde */}
                        <Link
                            to="/my-posts"
                            className="px-4 py-2 text-sm font-medium text-indigo-600 bg-white border border-indigo-600 rounded-lg hover:bg-indigo-50 transition-colors"
                        >
                            Mis Posts
                        </Link>
                        {/* NUEVO BOTÓN: CREAR POST (Solo para logueados) */}
                        <Link to="/new-post" className="btn btn-success me-3 d-flex align-items-center shadow-sm">
                            <span className="me-1">+</span> Nuevo Post
                        </Link>





                        <button onClick={handleLogout} className="btn btn-outline-danger btn-sm">
                            Cerrar Sesión
                        </button>
                    </>
                )}
            </div>
        </nav>
    );
};

export default Navbar;