import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_BASE } from '../utils/backend';
import { compressImage } from '../utils/imageCompression';
import UploadProgress from '../components/UploadProgress';

const MAX_PHOTOS_PER_EXP = 10;

// ----------- Hook de búsqueda Nominatim (OpenStreetMap) -----------
function useNominatim(query, minChars = 2) {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    if (!query || query.length < minChars) {
      setResults([]);
      return;
    }
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=6&addressdetails=1`,
          { headers: { 'Accept-Language': 'es' } }
        );
        const data = await res.json();
        setResults(data || []);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 350);
    return () => clearTimeout(timerRef.current);
  }, [query]);

  return { results, loading };
}

// ----------- Componente de campo con buscador de lugar -----------
function PlaceSearchInput({ value, onChange, placeholder, inputStyle }) {
  const [inputVal, setInputVal] = useState(value || '');
  const [open, setOpen] = useState(false);
  const { results, loading } = useNominatim(inputVal);
  const wrapperRef = useRef(null);

  // Cerrar dropdown al hacer click fuera
  useEffect(() => {
    const handler = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleChange = (e) => {
    setInputVal(e.target.value);
    onChange(e.target.value, null);
    setOpen(true);
  };

  const handleSelect = (item) => {
    // Nombre legible: nombre del lugar o display_name resumido
    const name = item.display_name.split(',').slice(0, 3).join(', ');
    setInputVal(name);
    const lat = item.lat != null ? parseFloat(item.lat) : null;
    const lng = item.lon != null ? parseFloat(item.lon) : null;
    onChange(name, { lat, lng });
    setOpen(false);
  };

  return (
    <div ref={wrapperRef} style={{ position: 'relative', width: '100%' }}>
      <div style={{ position: 'relative' }}>
        <span
          style={{
            position: 'absolute',
            left: '12px',
            top: '50%',
            transform: 'translateY(-50%)',
            fontSize: '1rem',
            pointerEvents: 'none'
          }}
        >
          📍
        </span>
        <input
          type="text"
          value={inputVal}
          onChange={handleChange}
          onFocus={() => inputVal.length >= 2 && setOpen(true)}
          placeholder={placeholder}
          style={{
            ...inputStyle,
            paddingLeft: '38px',
            paddingRight: loading ? '38px' : inputStyle?.paddingRight || '14px'
          }}
          autoComplete="off"
        />
        {loading && (
          <span
            style={{
              position: 'absolute',
              right: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              fontSize: '0.8rem',
              color: 'rgba(255,255,255,0.4)'
            }}
          >
            ⏳
          </span>
        )}
      </div>

      {open && results.length > 0 && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            zIndex: 9999,
            background: '#1a2233',
            border: '1px solid rgba(0,242,254,0.25)',
            borderRadius: '10px',
            marginTop: '4px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
            overflow: 'hidden'
          }}
        >
          {results.map((item, i) => {
            const parts = item.display_name.split(',');
            const primary = parts.slice(0, 2).join(',').trim();
            const secondary = parts.slice(2, 4).join(',').trim();
            return (
              <div
                key={item.place_id || i}
                onMouseDown={() => handleSelect(item)}
                style={{
                  padding: '10px 14px',
                  cursor: 'pointer',
                  borderBottom: i < results.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                  transition: 'background 0.15s'
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(0,242,254,0.08)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                <div style={{ color: '#fff', fontSize: '0.9rem', fontWeight: 600 }}>
                  📍 {primary}
                </div>
                {secondary && (
                  <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem', marginTop: '2px' }}>
                    {secondary}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ----------- Componente principal -----------
const CreateRoute = () => {
  const navigate = useNavigate();
  const [routeData, setRouteData] = useState({
    title: '',
    destination: '',
    budget: 'Medio'
  });
  const [experiences, setExperiences] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploadProgresses, setUploadProgresses] = useState({});

  const icons = {
    vuelo: '✈️', aeropuerto: '🛫', hotel: '🏨',
    restaurante: '🍽️', vip: '💎', cafe: '☕',
    lugar: '🗺️', transporte: '🚖', otro: '📍'
  };

  const inputBase = {
    width: '100%',
    padding: '12px 14px',
    borderRadius: '10px',
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.08)',
    color: '#fff',
    outline: 'none',
    fontSize: '0.95rem'
  };

  const addExperience = (type) => {
    setExperiences(prev => [
      ...prev,
      { type, title: '', description: '', rating: 5, location: '', lat: null, lng: null, icon: icons[type] || '📍', images: [] }
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

  // ---- Subida de fotos (corregido: usa API_BASE en lugar de getBackendURL()) ----
  const handleFileUpload = async (index, e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const copy = [...experiences];
    const remaining = MAX_PHOTOS_PER_EXP - (copy[index].images?.length || 0);
    const toUpload = files.slice(0, remaining);

    for (const file of toUpload) {
      let compressedFile = file;
      try {
        compressedFile = await compressImage(file);
      } catch {
        // si falla la compresión, sube el original
      }

      const formData = new FormData();
      formData.append('file', compressedFile);

      await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', `${API_BASE}/api/upload-step-image`);
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
                // Cloudinary devuelve URL completa (https://cloudinary-marketing-res.cloudinary.com/images/w_1000,c_scale/v1679921049/Image_URL_header/Image_URL_header-png?_i=AA), la usamos directamente
                const finalUrl = data.url.startsWith('http') ? data.url : `${API_BASE}${data.url}`;
                copy[index] = {
                  ...copy[index],
                  images: [...(copy[index].images || []), finalUrl]
                };
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

    setExperiences([...copy]);
    if (e.target) e.target.value = '';
  };

  const removeImage = (expIndex, imgIndex) => {
    setExperiences(prev => {
      const copy = [...prev];
      copy[expIndex] = {
        ...copy[expIndex],
        images: copy[expIndex].images.filter((_, i) => i !== imgIndex)
      };
      return copy;
    });
  };

  // ---- Submit: al publicar redirige al detalle de la ruta ----
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!routeData.title.trim()) return alert('Título requerido');
    if (!routeData.destination.trim()) return alert('Destino requerido');
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
        const data = await res.json();
        const routeId = data?.route?.id || data?.id;
        // Redirige al detalle de la ruta recién creada
        if (routeId) {
          navigate(`/route/${routeId}`);
        } else {
          navigate('/my-routes');
        }
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
      {/* HEADER */}
      <div
        className="text-center text-white"
        style={{
          background: 'linear-gradient(135deg, #0f2027 0%, #203a43 50%, #2c5364 100%)',
          padding: '50px 20px 40px',
          position: 'relative'
        }}
      >
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '4px', background: 'linear-gradient(to right, #00f2fe, #4facfe, #f9d423)' }} />
        <p style={{ color: '#f9d423', letterSpacing: '3px', fontSize: '0.7rem', textTransform: 'uppercase', marginBottom: '8px' }}>
          Tu espacio viajero
        </p>
        <h1 className="fw-black mb-2" style={{ fontSize: '2.2rem', letterSpacing: '-1px' }}>
          Registrar{' '}
          <span style={{ background: 'linear-gradient(135deg, #f9d423 0%, #ff4e50 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Nueva Ruta
          </span>
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.95rem' }}>
          Comparte tu experiencia paso a paso con la comunidad
        </p>
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '1px', background: 'linear-gradient(to right, transparent, #00f2fe, transparent)' }} />
      </div>

      <div className="container py-5" style={{ maxWidth: '980px' }}>
        <form onSubmit={handleSubmit}>

          {/* TRAVEL INFO CARD */}
          <div className="p-4 mb-4" style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.06)' }}>
            <h5 style={{ color: '#f9d423', marginBottom: '16px' }}>🌍 Información del Viaje</h5>

            <div className="row g-3">
              {/* Título */}
              <div className="col-12">
                <label style={{ color: 'rgba(255,255,255,0.6)', display: 'block', marginBottom: '6px', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '1px' }}>
                  Título del viaje
                </label>
                <input
                  name="title"
                  onChange={handleRouteInfo}
                  value={routeData.title}
                  style={inputBase}
                  placeholder="Ej: Mi Eurotrip de Verano"
                  required
                />
              </div>

              {/* Destino con buscador Nominatim */}
              <div className="col-12">
                <label style={{ color: 'rgba(255,255,255,0.6)', display: 'block', marginBottom: '6px', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '1px' }}>
                  Destino Principal
                </label>
                <PlaceSearchInput
                  value={routeData.destination}
                  onChange={(val) => setRouteData(prev => ({ ...prev, destination: val }))}
                  placeholder="Busca una ciudad o lugar... ej: Madrid, París"
                  inputStyle={inputBase}
                />
                <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.72rem', marginTop: '5px' }}>
                  🗺️ Empieza a escribir para ver sugerencias de OpenStreetMap
                </p>
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
                style={{ background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)' }}
              >
                <button
                  type="button"
                  onClick={() => removeExperience(index)}
                  className="position-absolute top-0 end-0 m-3"
                  style={{ background: 'rgba(255,78,80,0.15)', color: '#ff6b6b', border: '1px solid rgba(255,78,80,0.3)', borderRadius: '50%', width: '30px', height: '30px', cursor: 'pointer' }}
                  title="Eliminar experiencia"
                >✕</button>

                <div className="d-flex align-items-center mb-3">
                  <span style={{ fontSize: '1.6rem', marginRight: '10px' }}>{exp.icon}</span>
                  <h6 className="mb-0 text-uppercase fw-bold" style={{ color: '#f9d423' }}>{exp.type}</h6>
                </div>

                <div className="row g-3">
                  {/* Nombre */}
                  <div className="col-md-8">
                    <input
                      placeholder={`Nombre del ${exp.type}`}
                      value={exp.title}
                      onChange={(e) => handleExpChange(index, 'title', e.target.value)}
                      style={inputBase}
                      required
                    />
                  </div>

                  {/* Rating */}
                  <div className="col-md-4">
                    <select
                      value={exp.rating}
                      onChange={(e) => handleExpChange(index, 'rating', e.target.value)}
                      style={{ ...inputBase, cursor: 'pointer' }}
                    >
                      <option value="5">⭐⭐⭐⭐⭐ Excelente</option>
                      <option value="4">⭐⭐⭐⭐ Muy bueno</option>
                      <option value="3">⭐⭐⭐ Normal</option>
                      <option value="2">⭐⭐ Malo</option>
                      <option value="1">⭐ Pésimo</option>
                    </select>
                  </div>

                  {/* Ubicación con buscador Nominatim */}
                  <div className="col-12">
                    <label style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.75rem', display: 'block', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                      Ubicación
                    </label>
                    <PlaceSearchInput
                      value={exp.location}
                      onChange={(val, coords) => {
                        handleExpChange(index, 'location', val);
                        if (coords) {
                          handleExpChange(index, 'lat', coords.lat);
                          handleExpChange(index, 'lng', coords.lng);
                        }
                      }}
                      placeholder={`Busca la ubicación del ${exp.type}...`}
                      inputStyle={inputBase}
                    />
                    <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: '0.7rem', marginTop: '4px' }}>
                      🗺️ Escribe para buscar en el mapa
                    </p>
                  </div>

                  {/* Descripción */}
                  <div className="col-12">
                    <textarea
                      placeholder="Cuéntanos tu experiencia..."
                      value={exp.description}
                      onChange={(e) => handleExpChange(index, 'description', e.target.value)}
                      rows="3"
                      style={{ ...inputBase, resize: 'vertical' }}
                    />
                  </div>

                  {/* Zona de fotos */}
                  <div className="col-12">
                    <div
                      onClick={() => document.getElementById(`photoInput-${index}`)?.click()}
                      onDragOver={(ev) => ev.preventDefault()}
                      onDrop={(ev) => {
                        ev.preventDefault();
                        handleFileUpload(index, { target: { files: ev.dataTransfer.files } });
                      }}
                      style={{
                        border: '2px dashed rgba(0,242,254,0.2)',
                        borderRadius: '12px',
                        padding: '30px',
                        textAlign: 'center',
                        cursor: 'pointer',
                        color: 'rgba(255,255,255,0.5)',
                        background: 'rgba(0,242,254,0.02)',
                        transition: 'border-color 0.2s'
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'rgba(0,242,254,0.45)')}
                      onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'rgba(0,242,254,0.2)')}
                    >
                      <div style={{ fontSize: '2.2rem', marginBottom: '6px' }}>📷</div>
                      <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>
                        Arrastra fotos aquí o{' '}
                        <span style={{ color: '#f9d423' }}>haz clic para seleccionar</span>
                      </div>
                      <div style={{ marginTop: '6px', color: 'rgba(255,255,255,0.25)', fontSize: '0.8rem' }}>
                        Máximo {MAX_PHOTOS_PER_EXP} fotos · JPG, PNG, WEBP — se guardan en Cloudinary
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
                      <UploadProgress
                        percent={uploadProgresses[index]}
                        label={`Subiendo fotos en ${exp.type} #${index + 1}...`}
                      />
                    )}

                    {exp.images && exp.images.length > 0 && (
                      <div style={{ display: 'flex', gap: '8px', marginTop: '12px', flexWrap: 'wrap' }}>
                        {exp.images.map((src, i) => (
                          <div key={i} style={{ position: 'relative' }}>
                            <img
                              src={src}
                              alt=""
                              style={{ width: '88px', height: '88px', objectFit: 'cover', borderRadius: '10px', border: '2px solid rgba(0,242,254,0.2)' }}
                              onError={(e) => { e.target.style.display = 'none'; }}
                            />
                            <button
                              type="button"
                              onClick={() => removeImage(index, i)}
                              style={{
                                position: 'absolute', top: '4px', right: '4px',
                                width: '22px', height: '22px', borderRadius: '50%',
                                background: 'rgba(220,53,69,0.9)', border: 'none',
                                color: '#fff', cursor: 'pointer', fontSize: '0.7rem', fontWeight: 'bold'
                              }}
                            >✕</button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {/* Añadir experiencia */}
            <div className="p-3 mt-3 text-center" style={{ background: 'rgba(255,255,255,0.01)', borderRadius: '12px', border: '1px dashed rgba(255,255,255,0.06)' }}>
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem', marginBottom: '12px' }}>
                ➕ Añadir experiencia al diario
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center' }}>
                {Object.entries(icons).map(([type, icon]) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => addExperience(type)}
                    style={{
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      color: 'rgba(255,255,255,0.85)',
                      borderRadius: '18px',
                      padding: '8px 16px',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#f9d423'; e.currentTarget.style.color = '#f9d423'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = 'rgba(255,255,255,0.85)'; }}
                  >
                    <span style={{ marginRight: '6px' }}>{icon}</span>
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* SUBMIT */}
          <div className="text-center mt-4">
            <button
              type="submit"
              disabled={loading || experiences.length === 0}
              style={{
                background: experiences.length === 0 || loading
                  ? 'rgba(255,255,255,0.06)'
                  : 'linear-gradient(135deg, #f9d423 0%, #ff4e50 100%)',
                color: experiences.length === 0 || loading ? 'rgba(255,255,255,0.4)' : '#000',
                borderRadius: '16px',
                border: 'none',
                padding: '14px 48px',
                fontSize: '1rem',
                fontWeight: 800,
                boxShadow: experiences.length === 0 ? 'none' : '0 0 24px rgba(249,212,35,0.2)',
                cursor: experiences.length === 0 ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s'
              }}
            >
              {loading ? (
                <><span className="spinner-border spinner-border-sm me-2" />Publicando...</>
              ) : (
                '🚀 Publicar mi Ruta de Viaje'
              )}
            </button>
            {experiences.length === 0 && (
              <p style={{ color: 'rgba(255,255,255,0.3)', marginTop: '10px', fontSize: '0.85rem' }}>
                Añade al menos una experiencia para poder publicar
              </p>
            )}
          </div>
        </form>
      </div>

      <style>{`
        body { background: #0d1117 !important; }
        input::placeholder, textarea::placeholder { color: rgba(255,255,255,0.28) !important; }
        input[type="date"]::-webkit-calendar-picker-indicator { filter: invert(1); }
        select option { background: #1a2233; color: #fff; }
      `}</style>
    </div>
  );
};

export default CreateRoute;
