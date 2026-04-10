// src/front/main.jsx
import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import AppRoutes from "./routes";
import Navbar from "./components/Navbar";
import { StoreProvider } from "./store";
import "./index.css";

function App() {
  return (
    <StoreProvider>
      <BrowserRouter>
        <Navbar />
        <AppRoutes />
      </BrowserRouter>
    </StoreProvider>
  );
}

const rootEl = document.getElementById("root");
if (!rootEl) {
  const bodyDiv = document.createElement("div");
  bodyDiv.id = "root";
  document.body.appendChild(bodyDiv);
}
createRoot(document.getElementById("root")).render(<App />);