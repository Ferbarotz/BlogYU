import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

const Register = () => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        confirmPassword: ''
    });

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (formData.password !== formData.confirmPassword) {
            alert("Las contraseñas no coinciden");
            return;
        }

        try {
            const response = await fetch("https://miniature-winner-69wvjp9g5q673x6jp-5000.app.github.dev/api/users", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: formData.name,
                    email: formData.email,
                    password: formData.password
                })
            });

            if (response.ok) {
                // Navegamos directo al login tras el éxito
                navigate("/login"); 
            } else {
                const errorData = await response.json();
                alert("Error: " + (errorData.msg || "No se pudo crear el usuario"));
            }
        } catch (error) {
            alert("Error de conexión con el servidor");
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100 p-6">
            <div className="bg-white p-8 rounded shadow-md w-full max-w-md">
                
                {/* BOTÓN VOLVER AL INICIO */}
                <div className="mb-4">
                    <Link to="/" className="text-indigo-600 hover:text-indigo-800 text-sm font-medium flex items-center">
                        <span className="mr-1">←</span> Volver al Inicio
                    </Link>
                </div>

                <h2 className="text-2xl font-bold mb-6 text-center text-indigo-600">Crear Cuenta</h2>
                
                <form onSubmit={handleSubmit} className="space-y-4">
                    <input name="name" placeholder="Nombre Completo" onChange={handleChange} value={formData.name} className="w-full p-2 border rounded focus:ring-2 focus:ring-indigo-400 outline-none" required />
                    <input name="email" type="email" placeholder="Correo Electrónico" onChange={handleChange} value={formData.email} className="w-full p-2 border rounded focus:ring-2 focus:ring-indigo-400 outline-none" required />
                    <input name="password" type="password" placeholder="Contraseña" onChange={handleChange} value={formData.password} className="w-full p-2 border rounded focus:ring-2 focus:ring-indigo-400 outline-none" required />
                    <input name="confirmPassword" type="password" placeholder="Confirmar Contraseña" onChange={handleChange} value={formData.confirmPassword} className="w-full p-2 border rounded focus:ring-2 focus:ring-indigo-400 outline-none" required />
                    
                    <button type="submit" className="w-full bg-indigo-600 text-white p-2 rounded font-bold hover:bg-indigo-700 transition shadow-md">
                        Registrarse
                    </button>
                </form>

                {/* ENLACE PARA IR A LOGIN */}
                <div className="mt-6 text-center border-t pt-4">
                    <p className="text-gray-600 text-sm">
                        ¿Ya tienes una cuenta? 
                        <Link to="/login" className="text-indigo-600 font-bold hover:underline ml-1">
                            Inicia sesión aquí
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Register;