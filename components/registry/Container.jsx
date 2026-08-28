"use client";

import React from "react";

export default function ContainerBlock({ props = {}, styles = {}, isSelected = false, onClick, isEditable = false, children }) {
  const {
    layoutType = "flex", // 'flex' | 'grid'
    direction = "row", // 'row' | 'column'
    gap = "16px",
    columns = 2,
    alignItems = "center",
    justifyContent = "center",
  } = props;

  const containerStyle = {
    display: layoutType,
    flexDirection: layoutType === "flex" ? direction : undefined,
    gridTemplateColumns: layoutType === "grid" ? `repeat(${columns}, minmax(0, 1fr))` : undefined,
    gap: gap,
    alignItems: alignItems,
    justifyContent: justifyContent,
    padding: styles.padding || "24px",
    backgroundColor: styles.backgroundColor && styles.backgroundColor !== "TRANSPARENT" ? styles.backgroundColor : "transparent",
    color: styles.textColor || "inherit",
    borderRadius: styles.borderRadius || "16px",
    border: styles.border || undefined,
    minHeight: "80px",
    width: "100%",
  };

  return (
    <div
      onClick={onClick}
      style={containerStyle}
      className={`relative transition-all my-2 ${
        isSelected ? "ring-2 ring-blue-500 ring-offset-2" : "hover:outline hover:outline-dashed hover:outline-blue-300"
      }`}
    >
      {children && children.length > 0 ? (
        children
      ) : isEditable ? (
        <div className="w-full py-8 text-center border-2 border-dashed border-gray-300 rounded-xl text-xs font-bold text-gray-400">
          Flex / Grid Container (Drop or add widgets inside)
        </div>
      ) : null}
    </div>
  );
}
