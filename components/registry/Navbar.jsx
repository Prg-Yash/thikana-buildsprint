"use client";

import React from "react";
import Link from "next/link";
import { Store } from "lucide-react";

export default function Navbar({ props = {}, styles = {}, isSelected = false, onClick, isEditable = false }) {
  const {
    brandName = "Thikana Store",
    links = [
      { label: "Home", href: "#hero" },
      { label: "Products", href: "#products" },
      { label: "Location", href: "#map" },
      { label: "Contact", href: "#contact" },
    ],
  } = props;

  const containerStyle = {
    padding: styles.padding || "16px 24px",
    backgroundColor: styles.backgroundColor || "#FFFFFF",
    color: styles.textColor || "#1A1A1A",
  };

  return (
    <div
      onClick={onClick}
      style={containerStyle}
      className={`border-b border-gray-200 transition-all rounded-2xl my-2 ${
        isSelected ? "ring-2 ring-blue-500 ring-offset-2" : "hover:outline hover:outline-gray-300"
      }`}
    >
      <div className="max-w-5xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-black text-white flex items-center justify-center font-black text-sm">
            <Store className="w-4 h-4" />
          </div>
          <span className="font-extrabold text-base tracking-tight">{brandName}</span>
        </div>

        <nav className="flex items-center gap-6 text-xs font-bold text-gray-600">
          {links.map((link, idx) => (
            <a
              key={idx}
              href={link.href || "#"}
              onClick={(e) => isEditable && e.preventDefault()}
              className="hover:text-black transition"
            >
              {link.label}
            </a>
          ))}
        </nav>
      </div>
    </div>
  );
}
