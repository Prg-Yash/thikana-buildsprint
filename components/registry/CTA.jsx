"use client";

import React from "react";
import { ArrowRight } from "lucide-react";

export default function CTA({ props = {}, styles = {}, isSelected = false, onClick, isEditable = false }) {
  const {
    title = "Ready to boost your local business?",
    subtitle = "Join thousands of customers discovering unique local offerings every day.",
    buttonText = "Get Started Today",
    buttonLink = "#contact",
  } = props;

  const containerStyle = {
    padding: styles.padding || "48px 24px",
    backgroundColor: styles.backgroundColor || "#1A1A1A",
    color: styles.textColor || "#FFFFFF",
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
      <div className="max-w-3xl mx-auto space-y-4">
        <h2 className="text-2xl sm:text-4xl font-extrabold" style={{ fontFamily: "var(--font-heading)" }}>
          {title}
        </h2>
        <p className="text-xs sm:text-base opacity-80">{subtitle}</p>
        <div className="pt-2">
          <a
            href={buttonLink || "#"}
            onClick={(e) => isEditable && e.preventDefault()}
            className="inline-flex items-center gap-2 bg-white text-black font-bold px-6 py-3 rounded-xl hover:bg-gray-100 transition text-sm shadow-md"
          >
            {buttonText} <ArrowRight className="w-4 h-4" />
          </a>
        </div>
      </div>
    </div>
  );
}
