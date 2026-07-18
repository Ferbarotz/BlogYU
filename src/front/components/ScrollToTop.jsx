// src/front/components/ScrollToTop.jsx
import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/**
 * Componente que automáticamente lleva el scroll al inicio (top)
 * cada vez que cambia la ruta en la aplicación.
 * 
 * Se debe colocar dentro del <BrowserRouter> para que funcione.
 */
const ScrollToTop = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    // Scroll instantáneo al top en cada cambio de ruta
    window.scrollTo(0, 0);
  }, [pathname]);

  return null; // Este componente no renderiza nada visual
};

export default ScrollToTop;
