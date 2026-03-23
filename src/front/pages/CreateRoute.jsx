import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import getBackendURL from '../utils/backend';

const CreateRoute = () => {
    const navigate = useNavigate();
    const [routeData, setRouteData] = useState({
        title: '', destination: '', start_date: '', budget: 'Medio'
    });
    const [experiences, setExperiences] = useState([]);
    const [loading, setLoading] = useState(false);

    const icons = {
        vuelo: '✈️', aeropuerto: '🛫', hotel: '🏨',
        restaurante: '🍽️', vip: '💎', cafe: '☕',
        lugar: '🗺️', transporte: '🚖', otro: '📍'
    };

    const addExperience = (type) => {
        setExperiences([...experiences, {
            type, title: '', description: '', rating: 5,
            location: '', icon: icons[type] || '📍', images: []
        }]);
    };

    const handleRouteInfo = (e) => setRouteData({ ...routeData, [e.target.name]: e.target.value });

    const handleExpChange = (index, field, value) => {
        const newExps = [...experiences];
        newExps[index][field] = value;
        setExperiences(newExps);
    };

    const removeExperience = (index) => setExperiences(experiences.filter((_, i) => i !== index));

    const handleFileUpload = async (index, e) => {
        const files = Array.from(e.target.files);
        console.log("📁 Archivos seleccionados:", files.length, files.map(f => f.name));

        const newExps = [...experiences];
        const remaining = 10 - newExps[index].images.length;
        const toUpload = files.slice(0, remaining);

        const BACKEND = getBackendURL();
        console.log("🌐 Backend URL:", BACKEND);

        for (const file of toUpload) {
            const formData = new FormData();
            formData.append("file", file);

            try {
                console.log("⬆️ Subiendo:", file.name);
                const res = await fetch(`${BACKEND}/api/upload-step-image`, {
                    method: "POST",
                    headers: {
                        "Authorization": `Bearer ${localStorage.getItem("token")}`
                    },
                    body: formData
                });

                console.log("📡 Status:", res.status);
                const data = await res.json();
                console.log("📦 Respuesta:", data);

                if (res.ok) {
                    // ✅ CAMBIO: construir URL absoluta si el backend devuelve ruta relativa
                    const finalUrl = data.url.startsWith("http") ? data.url : `${BACKEND}${data.url}`;
                    newExps[index].images.push(finalUrl);
                    console.log("✅ URL final para mostrar:", finalUrl);
                } else {
                    console.error("❌ Error del servidor:", data);
                    alert(`Error: ${data.msg}`);
                }
            } catch (err) {
                console.error("💥 Error de red:", err);
                alert(`Error de conexión: ${err.message}`);
            }
        }

        setExperiences([...newExps]);
        e.target.value = "";
    };

    const removeImage = (expIndex, imgIndex) => {
        const newExps = [...experiences];
        newExps[expIndex].images.splice(imgIndex, 1);
        setExperiences([...newExps]);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const BACKEND = getBackendURL();
        setLoading(true);
        try {
            const response = await fetch(`${BACKEND}/api/routes`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${localStorage.getItem("token")}`
                },
                body: JSON.stringify({ ...routeData, steps: experiences })
            });
            if (response.ok) {
                alert("¡Ruta de viaje publicada con éxito! 🌍");
                navigate("/my-routes");
            } else {
                const err = await response.json();
                alert(`Error: ${err.msg || "No se pudo guardar la ruta"}`);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const inputStyle = {
        background: "rgba(255,255,255,0.08)",
        border: "1px solid rgba(161,140,209,0.4)",
        borderRadius: "10px", color: "#ffffff",
        padding: "10px 14px", width: "100%", outline: "none"
    };

    const labelStyle = {
        color: "#c9b8f0", fontSize: "0.75rem", fontWeight: "700",
        textTransform: "uppercase", letterSpacing: "0.08em",
        marginBottom: "6px", display: "block"
    };

    return (
        <div style={{ minHeight: "100vh", background: "#120b21", color: "#ffffff" }} className="py-5">
            <div className="container" style={{ maxWidth: "800px" }}>

                <div className="mb-5 text-center">
                    <h2 style={{ color: "#ffffff", fontWeight: "900" }} className="display-5">
                        Registrar <span style={{ color: "#a18cd1" }}>Nueva Ruta</span>
                    </h2>
                    <p style={{ color: "#a89bc2" }}>Comparte tu experiencia paso a paso con la comunidad</p>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="p-4 mb-4" style={{ background: "rgba(255,255,255,0.05)", borderRadius: "20px", border: "1px solid rgba(161,140,209,0.3)" }}>
                        <h5 className="mb-4" style={{ color: "#ffc107" }}>🌍 Información del Viaje</h5>
                        <div className="row g-3">
                            <div className="col-12">
                                <label style={labelStyle}>Título de la Aventura</label>
                                <input name="title" onChange={handleRouteInfo} style={inputStyle} placeholder="Ej: Mi Eurotrip de Verano" required />
                            </div>
                            <div className="col-md-6">
                                <label style={labelStyle}>Destino Principal</label>
                                <input name="destination" onChange={handleRouteInfo} style={inputStyle} placeholder="Ej: Madrid - París" required />
                            </div>
                            <div className="col-md-6">
                                <label style={labelStyle}>Fecha de Inicio</label>
                                <input type="date" name="start_date" onChange={handleRouteInfo} style={{ ...inputStyle, colorScheme: "dark" }} required />
                            </div>
                        </div>
                    </div>

                    <div className="mb-4">
                        <h5 className="mb-3" style={{ color: "#ffc107" }}>📍 Diario de Experiencias</h5>

                        {experiences.map((exp, index) => (
                            <div key={index} className="p-4 mb-3 position-relative" style={{ background: "rgba(161,140,209,0.1)", borderRadius: "15px", borderLeft: "5px solid #a18cd1" }}>
                                <button type="button" onClick={() => removeExperience(index)}
                                    className="position-absolute top-0 end-0 m-3"
                                    style={{ background: "rgba(255,255,255,0.1)", color: "#fff", border: "none", borderRadius: "50%", width: "28px", height: "28px", cursor: "pointer" }}>
                                    ✕
                                </button>

                                <div className="d-flex align-items-center mb-3">
                                    <span className="fs-3 me-2">{exp.icon}</span>
                                    <h6 className="mb-0 text-uppercase fw-bold" style={{ color: "#a18cd1" }}>{exp.type}</h6>
                                </div>

                                <div className="row g-3">
                                    <div className="col-md-8">
                                        <input placeholder={`Nombre del ${exp.type}`} style={inputStyle}
                                            onChange={(e) => handleExpChange(index, 'title', e.target.value)} required />
                                    </div>
                                    <div className="col-md-4">
                                        <select style={{ ...inputStyle, cursor: "pointer" }}
                                            onChange={(e) => handleExpChange(index, 'rating', e.target.value)}>
                                            <option value="5">⭐⭐⭐⭐⭐ Excelente</option>
                                            <option value="4">⭐⭐⭐⭐ Muy bueno</option>
                                            <option value="3">⭐⭐⭐ Normal</option>
                                            <option value="2">⭐⭐ Malo</option>
                                            <option value="1">⭐ Pésimo</option>
                                        </select>
                                    </div>
                                    <div className="col-12">
                                        <input placeholder="📌 Ubicación (opcional)" style={inputStyle}
                                            onChange={(e) => handleExpChange(index, 'location', e.target.value)} />
                                    </div>
                                    <div className="col-12">
                                        <textarea placeholder="Cuéntanos tu experiencia..."
                                            style={{ ...inputStyle, resize: "vertical" }} rows="2"
                                            onChange={(e) => handleExpChange(index, 'description', e.target.value)} />
                                    </div>

                                    <div className="col-12">
                                        <label style={labelStyle}>
                                            📸 Fotos de esta experiencia ({exp.images.length}/10)
                                        </label>
                                        <div className="d-flex flex-wrap gap-2 align-items-center">
                                            {exp.images.map((img, imgIdx) => (
                                                <div key={imgIdx} className="position-relative" style={{ width: "80px", height: "80px" }}>
                                                    <img src={img} alt={`foto-${imgIdx}`}
                                                        style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "8px", border: "2px solid #a18cd1" }}
                                                        onError={(e) => { e.target.src = "https://placehold.co/80?text=Error"; }} />
                                                    <button type="button" onClick={() => removeImage(index, imgIdx)}
                                                        style={{ position: "absolute", top: "-6px", right: "-6px", width: "20px", height: "20px", borderRadius: "50%", background: "#dc3545", color: "#fff", border: "none", fontSize: "10px", cursor: "pointer", lineHeight: "1" }}>
                                                        ✕
                                                    </button>
                                                </div>
                                            ))}

                                            {exp.images.length < 10 && (
                                                <label style={{
                                                    width: "80px", height: "80px", borderRadius: "8px",
                                                    border: "2px dashed #a18cd1", background: "rgba(161,140,209,0.1)",
                                                    color: "#a18cd1", fontSize: "1.8rem", display: "flex",
                                                    alignItems: "center", justifyContent: "center",
                                                    cursor: "pointer", flexDirection: "column", gap: "2px"
                                                }}>
                                                    +
                                                    <span style={{ fontSize: "0.55rem", color: "#c9b8f0", textAlign: "center", lineHeight: "1.2" }}>
                                                        Añadir foto
                                                    </span>
                                                    <input
                                                        type="file"
                                                        accept="image/*"
                                                        multiple
                                                        style={{ display: "none" }}
                                                        onChange={(e) => handleFileUpload(index, e)}
                                                    />
                                                </label>
                                            )}
                                        </div>
                                        {exp.images.length === 0 && (
                                            <p style={{ color: "#7a6e8a", fontSize: "0.75rem", marginTop: "6px" }}>
                                                Puedes añadir hasta 10 fotos por experiencia
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}

                        <div className="p-3 mt-3 text-center" style={{ background: "rgba(255,255,255,0.03)", borderRadius: "15px", border: "1px dashed rgba(161,140,209,0.4)" }}>
                            <p style={{ color: "#a89bc2", fontSize: "0.85rem", marginBottom: "12px" }}>➕ Añadir experiencia al diario</p>
                            <div className="d-flex flex-wrap gap-2 justify-content-center">
                                {Object.entries(icons).map(([type, icon]) => (
                                    <button key={type} type="button" onClick={() => addExperience(type)}
                                        style={{ background: "rgba(161,140,209,0.15)", border: "1px solid rgba(161,140,209,0.5)", color: "#e0d4ff", borderRadius: "20px", padding: "6px 16px", fontSize: "0.85rem", cursor: "pointer" }}>
                                        {icon} {type.charAt(0).toUpperCase() + type.slice(1)}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="text-center mt-5">
                        <button type="submit" disabled={loading || experiences.length === 0}
                            style={{
                                background: experiences.length === 0 ? "rgba(161,140,209,0.3)" : "linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)",
                                color: "#1a0a2e", borderRadius: "15px", border: "none",
                                padding: "14px 48px", fontSize: "1.1rem", fontWeight: "700",
                                cursor: experiences.length === 0 ? "not-allowed" : "pointer"
                            }}>
                            {loading ? "Publicando..." : "🚀 Publicar mi Ruta de Viaje"}
                        </button>
                        {experiences.length === 0 && (
                            <p style={{ color: "#a89bc2", fontSize: "0.85rem", marginTop: "8px" }}>
                                Añade al menos una experiencia para publicar
                            </p>
                        )}
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CreateRoute;