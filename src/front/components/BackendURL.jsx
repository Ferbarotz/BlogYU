export const getBackendURL = () => {
    const port = 5000;
    if (process.env.BACKEND_URL) return process.env.BACKEND_URL;
    
    // Si estamos en Codespaces, construye la URL dinámicamente
    if (window.location.hostname.includes("app.github.dev")) {
        return `https://${window.location.hostname.replace("-8080.", `-${port}.`)}`;
    }
    return `http://127.0.0.1:${port}`;
};
