import React from 'react';

const API_BASE = "https://psychic-waddle-4j6qxrj7v597hqq97-8080.app.github.dev"; // Cambia por la URL real de tu backend

const TestImages = () => {
  const images = [
    "step_1775994877.png",
    "step_1776006186_sergio-checo-perez-gp-canada-2024-1536x1024.jpg",
    // Agrega aquí solo nombres de archivos que sabes que existen en tu backend
  ];

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
      {images.map((img, idx) => (
        <img
          key={idx}
          src={`${API_BASE}/api/uploads/${img}`}
          alt={`Imagen ${idx}`}
          style={{ width: "150px", height: "auto", borderRadius: 8, boxShadow: "0 0 8px rgba(0,242,254,0.5)" }}
          onError={(e) => { e.target.src = "https://via.placeholder.com/150?text=No+Image"; }}
        />
      ))}
    </div>
  );
};

export default TestImages;