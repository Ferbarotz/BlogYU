import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_BASE } from '../api/backend';
import { compressImage } from '../utils/imageCompression';
import UploadProgress from '../components/UploadProgress';

const MAX_PHOTOS_PER_EXP = 10;

const CreateRoute = () => {
  const navigate = useNavigate();
  const [routeData, setRouteData] = useState({
    title: '',
    destination: '',
    start_date: '',
    budget: 'Medio'
  });
  const [experiences, setExperiences] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploadProgresses, setUploadProgresses] = useState({}); // key: expIndex, value: percent

  const icons = {
    vuelo: '✈️', aeropuerto: '🛫', hotel: '🏨',
    restaurante: '🍽️', vip: '💎', cafe: '☕',
    lugar: '🗺️', transporte: '🚖', otro: '📍'
  };

  const addExperience = (type) => {
    setExperiences(prev => [
      ...prev,
      {
        type,
        title: '',
        description: '',
        rating: 5,
        location: '',
        icon: icons[type] || '📍',
        images: []
      }
    ]);
  };

  const handleRouteInfo = (e) => setRouteData({ ...routeData, [e.target.name]: e.target.value });

  const handleExpChange = (index, field, value) => {
    setExperiences(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const removeExperience = (index) => {
    setExperiences(prev => prev.filter((_, i) => i !== index));
  };

  const handleFileUpload = async (index, e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const copy = [...experiences];
    const remaining = MAX_PHOTOS_PER_EXP - (copy[index].images?.length || 0);
    const toUpload = files.slice(0, remaining);
    const BACKEND = getBackendURL();

    for (const file of toUpload) {
      // Comprimir antes de subir
      const compressedFile = await compressImage(file);

      const formData = new FormData();
      formData.append('file', compressedFile);

      await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', `${BACKEND}/api/upload-step-image`);
        xhr.setRequestHeader('Authorization', `Bearer ${localStorage.getItem('token')}`);

        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const percent = Math.round((event.loaded / event.total) * 100);
            setUploadProgresses(prev => ({ ...prev, [index]: percent }));
          }
        };

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const data = JSON.parse(xhr.responseText);
              if (data?.url) {
                const finalUrl = data.url.startsWith('http') ? data.url : `${BACKEND}${data.url}`;
                copy[index].images = copy[index].images ? [...copy[index].images, finalUrl] : [finalUrl];
                setUploadProgresses(prev => ({ ...prev, [index]: 0 }));
                resolve();
              } else {
                reject(new Error('No se recibió URL válida'));
              }
            } catch {
              reject(new Error('Respuesta inválida del servidor'));
            }
          } else {
            reject(new Error(`Error ${xhr.status}: ${xhr.statusText}`));
          }
        };

        xhr.onerror = () => reject(new Error('Error de red'));

        xhr.send(formData);
      }).catch(err => {
        alert(`Error subiendo ${file.name}: ${err.message}`);
      });
    }

    setExperiences(copy);
    if (e.target) e.target.value = '';
  };

  const removeImage = (expIndex, imgIndex) => {
    setExperiences(prev => {
      const copy = [...prev];
      copy[expIndex].images = copy[expIndex].images.filter((_, i) => i !== imgIndex);
      return copy;
    });
  };

  const handleSubmit = async (e) => {
  e.preventDefault();

  if (!routeData.title.trim()) return alert('Título requerido');
  if (!experiences.length) return alert('Añade al menos una experiencia');

  setLoading(true);
  try {
    const res = await fetch(`${API_BASE}/api/routes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({ ...routeData, steps: experiences })
    });
    if (res.ok) {
      alert('¡Ruta de viaje publicada con éxito! 🌍');
      navigate('/my-routes');
    } else {
      const err = await res.json().catch(() => ({}));
      alert(`Error: ${err.msg || 'No se pudo guardar la ruta'}`);
    }
  } catch (err) {
    console.error(err);
    alert('Error de conexión. Intenta de nuevo.');
  } finally {
    setLoading(false);
  }
  };

  return (
    <div style={{ background: '#0d1117', minHeight: '100vh', color: '#fff', fontFamily: 'system-ui, sans-serif' }}>
      {/* HEADER (same style as MyRoutes) */}
      <div
        className="text-center text-white"
        style={{
          background: 'linear-gradient(135deg, #0f2027 0%, #203a43 50%, #2c5364 100%)',
          padding: '50px 20px 40px',
          position: 'relative'
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '4px',
            background: 'linear-gradient(to right, #00f2fe, #4facfe, #f9d423)'
          }}
        />
        <p
          style={{
            color: '#f9d423',
            letterSpacing: '3px',
            fontSize: '0.7rem',
            textTransform: 'uppercase',
            marginBottom: '8px'
          }}
        >
          Tu espacio viajero
        </p>
        <h1 className="fw-black mb-2" style={{ fontSize: '2.2rem', letterSpacing: '-1px' }}>
          Registrar{' '}
          <span
            style={{
              background: 'linear-gradient(135deg, #f9d423 0%, #ff4e50 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}
          >
            Nueva Ruta
          </span>
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.95rem', marginBottom: '18px' }}>
          Comparte tu experiencia paso a paso con la comunidad
        </p>

        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: '1px',
            background: 'linear-gradient(to right, transparent, #00f2fe, transparent)'
          }}
        />
      </div>

      <div className="container py-5" style={{ maxWidth: '980px' }}>
        <form onSubmit={handleSubmit}>
          {/* TRAVEL INFO CARD */}
          <div
            className="p-4 mb-4"
            style={{
              background: 'rgba(255,255,255,0.03)',
              borderRadius: '14px',
              border: '1px solid rgba(255,255,255,0.06)'
            }}
          >
            <h5 style={{ color: '#f9d423', marginBottom: '12px' }}>🌍 Información del Viaje</h5>

            <div className="row g-3">
              <div className="col-12">
                <label style={{ color: 'rgba(255,255,255,0.7)', display: 'block', marginBottom: '6px', fontSize: '0.85rem' }}>
                  Título
                </label>
                <input
                  name="title"
                  onChange={handleRouteInfo}
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    borderRadius: '10px',
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid rgba(255,255,255,0.05)',
                    color: '#fff',
                    outline: 'none'
                  }}
                  placeholder="Ej: Mi Eurotrip de Verano"
                  required
                />
              </div>

              <div className="col-md-6">
                <label style={{ color: 'rgba(255,255,255,0.7)', display: 'block', marginBottom: '6px', fontSize: '0.85rem' }}>
                  Destino Principal
                </label>
                <input
                  name="destination"
                  onChange={handleRouteInfo}
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    borderRadius: '10px',
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid rgba(255,255,255,0.05)',
                    color: '#fff',
                    outline: 'none'
                  }}
                  placeholder="Ej: Madrid - París"
                  required
                />
              </div>

              <div className="col-md-6">
                <label style={{ color: 'rgba(255,255,255,0.7)', display: 'block', marginBottom: '6px', fontSize: '0.85rem' }}>
                  Fecha de Inicio
                </label>
                <input
                  type="date"
                  name="start_date"
                  onChange={handleRouteInfo}
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    borderRadius: '10px',
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid rgba(255,255,255,0.05)',
                    color: '#fff',
                    outline: 'none'
                  }}
                  required
                />
              </div>
            </div>
          </div>

          {/* EXPERIENCES / DIARY */}
          <div className="mb-4">
            <h5 style={{ color: '#f9d423', marginBottom: '12px' }}>📍 Diario de Experiencias</h5>

            {experiences.map((exp, index) => (
              <div
                key={index}
                className="p-4 mb-3 position-relative"
                style={{
                  background: 'rgba(255,255,255,0.02)',
                  borderRadius: '12px',
                  border: '1px solid rgba(255,255,255,0.06)'
                }}
              >
                <button
                  type="button"
                  onClick={() => removeExperience(index)}
                  className="position-absolute top-0 end-0 m-3"
                  style={{
                    background: 'rgba(255,255,255,0.03)',
                    color: '#fff', border: 'none',
                    borderRadius: '50%', width: '30px', height: '30px', cursor: 'pointer'
                  }}
                  title="Eliminar experiencia"
                >
                  ✕
                </button>

                <div className="d-flex align-items-center mb-3">
                  <span style={{ fontSize: '1.6rem', marginRight: '10px' }}>{exp.icon}</span>
                  <h6 className="mb-0 text-uppercase fw-bold" style={{ color: '#f9d423' }}>
                    {exp.type}
                  </h6>
                </div>

                <div className="row g-3">
                  <div className="col-md-8">
                    <input
                      placeholder={`Nombre del ${exp.type}`}
                      value={exp.title}
                      onChange={(e) => handleExpChange(index, 'title', e.target.value)}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        borderRadius: '10px',
                        background: 'rgba(255,255,255,0.02)',
                        border: '1px solid rgba(255,255,255,0.05)',
                        color: '#fff'
                      }}
                      required
                    />
                  </div>

                  <div className="col-md-4">
                    <select
                      value={exp.rating}
                      onChange={(e) => handleExpChange(index, 'rating', e.target.value)}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        borderRadius: '10px',
                        background: 'rgba(255,255,255,0.02)',
                        border: '1px solid rgba(255,255,255,0.05)',
                        color: '#fff',
                        cursor: 'pointer'
                      }}
                    >
                      <option value="5">⭐⭐⭐⭐⭐ Excelente</option>
                      <option value="4">⭐⭐⭐⭐ Muy bueno</option>
                      <option value="3">⭐⭐⭐ Normal</option>
                      <option value="2">⭐⭐ Malo</option>
                      <option value="1">⭐ Pésimo</option>
                    </select>
                  </div>

                  <div className="col-12">
                    <input
                      placeholder="📌 Ubicación (opcional)"
                      value={exp.location}
                      onChange={(e) => handleExpChange(index, 'location', e.target.value)}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        borderRadius: '10px',
                        background: 'rgba(255,255,255,0.02)',
                        border: '1px solid rgba(255,255,255,0.05)',
                        color: '#fff'
                      }}
                    />
                  </div>

                  <div className="col-12">
                    <textarea
                      placeholder="Cuéntanos tu experiencia..."
                      value={exp.description}
                      onChange={(e) => handleExpChange(index, 'description', e.target.value)}
                      rows="3"
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        borderRadius: '10px',
                        background: 'rgba(255,255,255,0.02)',
                        border: '1px solid rgba(255,255,255,0.05)',
                        color: '#fff',
                        resize: 'vertical'
                      }}
                    />
                  </div>

                  {/* BIG DASHED PHOTO AREA */}
                  <div className="col-12">
                    <div
                      onClick={() => document.getElementById(`photoInput-${index}`)?.click()}
                      onDragOver={(ev) => ev.preventDefault()}
                      style={{
                        border: '2px dashed rgba(255,255,255,0.12)',
                        borderRadius: '12px',
                        padding: '36px',
                        textAlign: 'center',
                        cursor: 'pointer',
                        color: 'rgba(255,255,255,0.6)',
                        background: 'rgba(255,255,255,0.01)'
                      }}
                    >
                      <div style={{ fontSize: '2.6rem', marginBottom: '8px' }}>📷</div>
                      <div style={{ fontWeight: 700, fontSize: '1rem' }}>
                        Arrastra fotos aquí o <span style={{ color: '#f9d423' }}>haz clic para seleccionar</span>
                      </div>
                      <div style={{ marginTop: '8px', color: 'rgba(255,255,255,0.28)' }}>
                        Máximo {MAX_PHOTOS_PER_EXP} fotos · JPG, PNG, WEBP
                      </div>

                      <input
                        id={`photoInput-${index}`}
                        type="file"
                        accept="image/*"
                        multiple
                        style={{ display: 'none' }}
                        onChange={(e) => handleFileUpload(index, e)}
                      />
                    </div>

                    {uploadProgresses[index] > 0 && (
                      <UploadProgress percent={uploadProgresses[index]} label={`Subiendo fotos experiencia #${index + 1}`} />
                    )}

                    {exp.images && exp.images.length > 0 && (
                      <div style={{ display: 'flex', gap: '8px', marginTop: '12px', flexWrap: 'wrap' }}>
                        {exp.images.map((src, i) => (
                          <div key={i} style={{ position: 'relative' }}>
                            <img src={src} alt="" style={{ width: '92px', height: '92px', objectFit: 'cover', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.04)' }} />
                            <button
                              type="button"
                              onClick={() => removeImage(index, i)}
                              style={{
                                position: 'absolute',
                                top: '6px',
                                right: '6px',
                                width: '26px',
                                height: '26px',
                                borderRadius: '50%',
                                background: 'rgba(220,53,69,0.9)',
                                border: 'none',
                                color: '#fff',
                                cursor: 'pointer'
                              }}
                              title="Eliminar foto"
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {/* ADD EXPERIENCE AREA */}
            <div
              className="p-3 mt-3 text-center"
              style={{
                background: 'rgba(255,255,255,0.01)',
                borderRadius: '12px',
                border: '1px dashed rgba(255,255,255,0.06)'
              }}
            >
              <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.95rem', marginBottom: '10px' }}>
                ➕ Añadir experiencia al diario
              </p>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center' }}>
                {Object.entries(icons).map(([type, icon]) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => addExperience(type)}
                    style={{
                      background: 'transparent',
                      border: '1px solid rgba(255,255,255,0.06)',
                      color: 'rgba(255,255,255,0.9)',
                      borderRadius: '18px',
                      padding: '8px 14px',
                      cursor: 'pointer'
                    }}
                  >
                    <span style={{ marginRight: '8px' }}>{icon}</span>
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* SUBMIT BUTTON */}
          <div className="text-center mt-4">
            <button
              type="submit"
              disabled={loading || experiences.length === 0}
              style={{
                background: experiences.length === 0 ? 'rgba(255,255,255,0.04)' : 'linear-gradient(135deg, #f9d423 0%, #ff4e50 100%)',
                color: experiences.length === 0 ? 'rgba(255,255,255,0.6)' : '#000',
                borderRadius: '16px',
                border: 'none',
                padding: '12px 40px',
                fontSize: '1rem',
                fontWeight: 800,
                boxShadow: experiences.length === 0 ? 'none' : '0 0 20px rgba(249,212,35,0.18)',
                cursor: experiences.length === 0 ? 'not-allowed' : 'pointer'
              }}
            >
              {loading ? 'Publicando...' : '🚀 Publicar mi Ruta de Viaje'}
            </button>

            {experiences.length === 0 && (
              <p style={{ color: 'rgba(255,255,255,0.4)', marginTop: '10px' }}>
                Añade al menos una experiencia para poder publicar
              </p>
            )}
          </div>
        </form>
      </div>

      <style>{`
        body { background: #0d1117 !important; }
        input::placeholder, textarea::placeholder { color: rgba(255,255,255,0.28) !important; }
      `}</style>
    </div>
  );
};

export default CreateRoute;