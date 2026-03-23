// src/front/api/backend.js
import { API_BASE, authHeaders as originalAuthHeaders } from "../../api/backend";

// Re-exportamos lo que ya viene configurado del archivo principal
export { API_BASE };

export const authHeaders = () => {
    if (typeof originalAuthHeaders === 'function') return originalAuthHeaders();
    const token = localStorage.getItem("token");
    return {
        "Content-Type": "application/json",
        ...(token ? { "Authorization": `Bearer ${token}` } : {})
    };
};