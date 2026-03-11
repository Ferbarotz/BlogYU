import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

const Login = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [message, setMessage] = useState('');

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('https://miniature-winner-69wvjp9g5q673x6jp-5000.app.github.dev/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await res.json();
      if (res.ok) {
        localStorage.setItem("token", data.token);
        localStorage.setItem("user", JSON.stringify(data.user));
        window.location.href = "/";
      } else {
        setMessage('Error: ' + (data.msg || 'Credenciales incorrectas'));
      }
    } catch (error) {
      setMessage('Error de conexión con el servidor');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-6">
      <div className="bg-white p-8 rounded shadow-md w-full max-w-md">

        {/* BOTÓN VOLVER AL INICIO */}
        <div className="mb-4">
          <Link to="/" className="text-green-600 hover:text-green-800 text-sm font-medium flex items-center">
            <span className="mr-1">←</span> Volver al Inicio
          </Link>
        </div>

        <h2 className="text-2xl font-bold mb-6 text-center text-green-600">Iniciar Sesión</h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <input 
            name="email" 
            type="email" 
            placeholder="Correo Electrónico" 
            onChange={handleChange} 
            value={formData.email} 
            className="w-full p-2 border rounded focus:ring-2 focus:ring-green-400 outline-none" 
            required 
          />
          <input 
            name="password" 
            type="password" 
            placeholder="Contraseña" 
            onChange={handleChange} 
            value={formData.password} 
            className="w-full p-2 border rounded focus:ring-2 focus:ring-green-400 outline-none" 
            required 
          />
          <button type="submit" className="w-full bg-green-600 text-white p-2 rounded font-bold hover:bg-green-700 transition shadow-md">
            Entrar
          </button>
        </form>

        {message && <p className="mt-4 text-center text-red-500 font-medium">{message}</p>}

        {/* ENLACE PARA IR A REGISTRO */}
        <div className="mt-6 text-center border-t pt-4">
          <p className="text-gray-600 text-sm">
            ¿Aún no tienes una cuenta? 
            <Link to="/register" className="text-green-600 font-bold hover:underline ml-1">
              Regístrate aquí
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;