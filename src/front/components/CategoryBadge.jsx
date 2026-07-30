// src/front/components/CategoryBadge.jsx
import React from "react";
import { getCategoryById } from "../utils/categories";

const CategoryBadge = ({ categoryId, size = "md", onClick, active = false, showLabel = true }) => {
  const category = getCategoryById(categoryId);
  const sizes = {
    sm: { padding: "4px 10px", fontSize: "0.7rem", iconSize: "0.9rem", borderRadius: "12px" },
    md: { padding: "6px 14px", fontSize: "0.85rem", iconSize: "1rem", borderRadius: "16px" },
    lg: { padding: "10px 20px", fontSize: "1rem", iconSize: "1.3rem", borderRadius: "20px" },
    xl: { padding: "14px 26px", fontSize: "1.1rem", iconSize: "1.5rem", borderRadius: "24px" }
  };
  const sizeConfig = sizes[size] || sizes.md;
  const baseStyle = {
    display: "inline-flex", alignItems: "center", gap: "6px", padding: sizeConfig.padding,
    borderRadius: sizeConfig.borderRadius, fontSize: sizeConfig.fontSize, fontWeight: "700",
    cursor: onClick ? "pointer" : "default", transition: "all 0.3s ease", border: "none",
    whiteSpace: "nowrap", userSelect: "none"
  };
  const activeStyle = active ? {
    background: category.gradient, color: "#000",
    boxShadow: \`0 4px 15px \${category.color}66\`, transform: "translateY(-2px)"
  } : {
    background: \`\${category.color}15\`, color: category.color,
    border: \`1px solid \${category.color}40\`, backdropFilter: "blur(4px)"
  };
  const hoverStyle = onClick && !active ? {
    background: \`\${category.color}25\`, border: \`1px solid \${category.color}60\`, transform: "translateY(-1px)"
  } : {};
  return (
    <div style={{ ...baseStyle, ...activeStyle }} onClick={onClick}
      onMouseEnter={(e) => { if (onClick && !active) Object.assign(e.currentTarget.style, hoverStyle); }}
      onMouseLeave={(e) => { if (onClick && !active) { e.currentTarget.style.background = \`\${category.color}15\`; e.currentTarget.style.border = \`1px solid \${category.color}40\`; e.currentTarget.style.transform = "translateY(0)"; }}}
      role={onClick ? "button" : undefined} tabIndex={onClick ? 0 : undefined}>
      <span style={{ fontSize: sizeConfig.iconSize }}>{category.emoji}</span>
      {showLabel && <span>{category.name}</span>}
    </div>
  );
};

export default CategoryBadge;
