"use client";

import React from "react";

export default function Footer({ props = {}, styles = {}, isSelected = false, onClick, isEditable = false }) {
  const {
    copyright = `© ${new Date().getFullYear()} Thikana Business. All rights reserved.`,
    tagline = "Empowering local businesses with digital presence.",
  } = props;

  const containerStyle = {
    padding: styles.padding || "32px 24px",
    backgroundColor: styles.backgroundColor || "#1A1A1A",
    color: styles.textColor || "#888888",
    textAlign: "center",
  };

  return (
    <div
      onClick={onClick}
      style={containerStyle}
      className={`transition-all rounded-2xl my-2 ${
        isSelected ? "ring-2 ring-blue-500 ring-offset-2" : "hover:outline hover:outline-gray-300"
      }`}
    >
      <div className="max-w-4xl mx-auto space-y-2">
        <p className="text-xs font-medium">{tagline}</p>
        <p className="text-[11px] text-gray-500">{copyright}</p>
      </div>
    </div>
  );
}
