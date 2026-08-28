"use client";

import React from "react";

export default function HeadingBlock({ props = {}, styles = {}, isSelected = false, onClick }) {
  const {
    text = "Editable Heading",
    tag = "h2", // 'h1' | 'h2' | 'h3' | 'h4'
  } = props;

  const style = {
    color: styles.textColor || "inherit",
    textAlign: styles.textAlign || "left",
    padding: styles.padding || "8px 0",
    fontSize: styles.fontSize || (tag === "h1" ? "2.25rem" : tag === "h2" ? "1.875rem" : "1.25rem"),
    fontWeight: styles.fontWeight || 800,
    fontFamily: "var(--font-heading)",
  };

  const Tag = tag;

  return (
    <div
      onClick={onClick}
      className={`transition-all rounded-lg ${
        isSelected ? "ring-2 ring-blue-500 ring-offset-1" : "hover:outline hover:outline-blue-200"
      }`}
    >
      <Tag style={style}>{text}</Tag>
    </div>
  );
}
