// src/front/store.js
import React, { createContext, useContext, useState, useEffect } from "react";

const StoreContext = createContext();

export function StoreProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem("token") || null);
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "null");
    } catch {
      return null;
    }
  });

  useEffect(() => {
    if (token) localStorage.setItem("token", token);
    else localStorage.removeItem("token");
  }, [token]);

  useEffect(() => {
    if (user) localStorage.setItem("user", JSON.stringify(user));
    else localStorage.removeItem("user");
  }, [user]);

  // Mantener el Context sincronizado con localStorage cuando otras partes de la
  // app (Login, Navbar, logout) escriben el token/usuario y disparan "authChange".
  useEffect(() => {
    const sync = () => {
      const t = localStorage.getItem("token") || null;
      let u = null;
      try {
        u = JSON.parse(localStorage.getItem("user") || "null");
      } catch {
        u = null;
      }
      setToken(t);
      setUser(u);
    };
    window.addEventListener("authChange", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("authChange", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  return (
    <StoreContext.Provider value={{ token, setToken, user, setUser }}>
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  return useContext(StoreContext);
}