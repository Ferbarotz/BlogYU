// src/front/pages/Categorias.jsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { API_BASE } from "../api/backend";

// Mapeo de iconos para que cada categoría tenga uno representativo
const ICON_MAP = {
  hoteles: "bi-building",
  restaurantes: "bi-utensils",
  bares: "bi-glass-cheers",
  lugares: "bi-map",
  cultura: "bi-bank",
  otros: "bi-grid",
  default: "bi-tag"
};

const Categorias = () => {
  const navigate = useNavigate();
  const [categorias, setCategorias] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCategorias = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/categories`);
        if (res.ok) {
          const data = await res.json();
          setCategorias(data);
        }
      } catch (error) {
        console.error("Error cargando categorías:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchCategorias();
  }, []);

  const handleCategoryClick = (catId) => {
  // Esto enviará al usuario a: /?category=hoteles
  navigate(`/?category=${catId}`);
};

  if (loading) return <div className="text-center py-5"><div className="spinner-border text-primary"></div></div>;

  return (
    <div className="container py-5">
      <div className="text-center mb-5">
        <h1 className="fw-bold">Explorar por Categoría</h1>
        <p className="text-muted">Selecciona un tema para descubrir las mejores recomendaciones.</p>
      </div>

      <div className="row row-cols-1 row-cols-sm-2 row-cols-md-3 g-4">
        {categorias.map((cat) => (
          <div className="col" key={cat.id}>
            <div 
              className="card h-100 border-0 shadow-sm text-center p-4 category-card"
              onClick={() => handleCategoryClick(cat.id)}
              style={{ 
                cursor: "pointer", 
                transition: "transform 0.3s, box-shadow 0.3s",
                borderRadius: "15px",
                backgroundColor: "#f8f9fa"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-10px)";
                e.currentTarget.style.boxShadow = "0 10px 20px rgba(0,0,0,0.1)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "0 4px 6px rgba(0,0,0,0.05)";
              }}
            >
              <div className="card-body">
                <div 
                  className="icon-container mb-3 d-inline-flex align-items-center justify-content-center bg-primary text-white rounded-circle"
                  style={{ width: "70px", height: "70px", fontSize: "30px" }}
                >
                  <i className={`bi ${ICON_MAP[cat.id] || ICON_MAP.default}`}></i>
                </div>
                <h4 className="card-title fw-bold">{cat.name}</h4>
                <p className="text-muted small">Ver todas las publicaciones</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Categorias;