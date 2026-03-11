import React from "react";
import { Link } from "react-router-dom";

const Profile = () => {
  const user = JSON.parse(localStorage.getItem("user") || "null");

  return (
    <div className="max-w-4xl mx-auto py-10 px-4">
      <div className="bg-white rounded-lg shadow p-6 flex items-center gap-6">
        <img
          src={user?.avatar || "https://placehold.co/150x150"}
          alt={user?.name || "Usuario"}
          className="w-32 h-32 rounded-full object-cover"
        />
        <div>
          <h2 className="text-2xl font-bold">{user?.name || "Usuario"}</h2>
          <p className="text-gray-600">{user?.email}</p>
          <div className="mt-4 flex gap-2">
            <Link to="/profile/edit" className="px-4 py-2 bg-indigo-600 text-white rounded">Editar perfil</Link>
            <Link to="/my-posts" className="px-4 py-2 border rounded">Ver mis publicaciones</Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;