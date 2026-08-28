"use client";

import React from "react";

export default function Hero({ props = {}, styles = {}, isSelected = false, onClick, isEditable = false }) {
  const {
    title = "Welcome to Our Store",
    subtitle = "Discover local products and unique offerings near you.",
    ctaText = "Shop Now",
    ctaLink = "#products",
    bgImage = "",
  } = props;

  const containerStyle = {
    padding: styles.padding || "64px 24px",
    backgroundColor: styles.backgroundColor && styles.backgroundColor !== "TRANSPARENT" ? styles.backgroundColor : "#1A1A1A",
    color: styles.textColor || "#FFFFFF",
    textAlign: styles.textAlign || "center",
    backgroundImage: bgImage ? `url(${bgImage})` : undefined,
    backgroundSize: "cover",
    backgroundPosition: "center",
  };

  return (
    <div
      onClick={onClick}
      style={containerStyle}
      className={`relative transition-all rounded-2xl my-2 ${
        isSelected ? "ring-2 ring-blue-500 ring-offset-2" : "hover:outline hover:outline-gray-300"
      }`}
    >
      <div className="max-w-4xl mx-auto space-y-4">
        <h1
          className="text-3xl sm:text-5xl font-extrabold tracking-tight"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          {title}
        </h1>
        <p className="text-sm sm:text-lg opacity-80 max-w-2xl mx-auto font-medium">
          {subtitle}
        </p>
        {ctaText && (
          <div className="pt-4">
            <a
              href={ctaLink || "#"}
              onClick={(e) => isEditable && e.preventDefault()}
              className="inline-block bg-white text-black font-bold px-6 py-3 rounded-xl shadow-md hover:bg-gray-100 transition text-sm"
            >
              {ctaText}
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
