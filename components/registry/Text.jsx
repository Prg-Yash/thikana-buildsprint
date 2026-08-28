"use client";

import React from "react";

export default function TextBlock({ props = {}, styles = {}, isSelected = false, onClick }) {
  const { text = "This is a body text block. Customize its typography, alignment, and color in the Inspector sidebar." } = props;

  const style = {
    color: styles.textColor || "inherit",
    textAlign: styles.textAlign || "left",
    padding: styles.padding || "4px 0",
    fontSize: styles.fontSize || "0.875rem",
    lineHeight: "1.6",
  };

  return (
    <div
      onClick={onClick}
      className={`transition-all rounded-lg ${
        isSelected ? "ring-2 ring-blue-500 ring-offset-1" : "hover:outline hover:outline-blue-200"
      }`}
    >
      <p style={style}>{text}</p>
    </div>
  );
}
