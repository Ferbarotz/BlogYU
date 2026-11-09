// Hook de notificaciones temporales (toasts) sin dependencias externas.
// Uso:
//   const { toasts, showToast, dismissToast } = useToast();
//   showToast("Ruta guardada", "success");
//   <Toast toasts={toasts} onDismiss={dismissToast} />
import { useState, useCallback, useRef, useEffect } from "react";

const DEFAULT_DURATION = 3500; // ms

export default function useToast(duration = DEFAULT_DURATION) {
  const [toasts, setToasts] = useState([]);
  const timers = useRef({});
  const nextId = useRef(0);

  const dismissToast = useCallback((id) => {
    clearTimeout(timers.current[id]);
    delete timers.current[id];
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // type: "success" | "error" | "info"
  const showToast = useCallback((message, type = "info") => {
    const id = ++nextId.current;
    setToasts((prev) => [...prev, { id, message: String(message ?? ""), type }].slice(-4));
    timers.current[id] = setTimeout(() => dismissToast(id), duration);
    return id;
  }, [duration, dismissToast]);

  // Limpiar temporizadores al desmontar la página
  useEffect(() => () => Object.values(timers.current).forEach(clearTimeout), []);

  return { toasts, showToast, dismissToast };
}
