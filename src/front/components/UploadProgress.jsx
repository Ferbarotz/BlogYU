// src/front/components/UploadProgress.jsx
import React from "react";

const UploadProgress = ({ percent, label }) => {
  return (
    <div style={{ margin: "12px 0" }}>
      <div style={{
        height: "8px",
        width: "100%",
        backgroundColor: "rgba(255,255,255,0.1)",
        borderRadius: "4px",
        overflow: "hidden"
      }}>
        <div style={{
          height: "100%",
          width: `${percent}%`,
          background: "linear-gradient(135deg, #00f2fe 0%, #4facfe 100%)",
          transition: "width 0.3s ease"
        }} />
      </div>
      <div style={{ color: "#00f2fe", fontSize: "0.85rem", marginTop: "4px", fontWeight: "600" }}>
        {label || `Subiendo... ${percent}%`}
      </div>
    </div>
  );
};

export default UploadProgress;