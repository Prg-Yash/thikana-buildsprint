"use client";

import React from "react";
import { Star, ShieldCheck, Truck, Store, Sparkles, Heart, Zap } from "lucide-react";

const ICON_MAP = {
  star: Star,
  shield: ShieldCheck,
  truck: Truck,
  store: Store,
  sparkles: Sparkles,
  heart: Heart,
  zap: Zap,
};

export default function IconBoxBlock({ props = {}, styles = {}, isSelected = false, onClick }) {
  const {
    icon = "star",
    title = "Feature Highlight",
    description = "Add a compelling description for this feature or benefit.",
  } = props;

  const IconComp = ICON_MAP[icon] || Sparkles;

  const containerStyle = {
    padding: styles.padding || "20px",
    backgroundColor: styles.backgroundColor && styles.backgroundColor !== "TRANSPARENT" ? styles.backgroundColor : "#F7F6F3",
    color: styles.textColor || "#1A1A1A",
    borderRadius: styles.borderRadius || "16px",
    textAlign: styles.textAlign || "left",
  };

  return (
    <div
      onClick={onClick}
      style={containerStyle}
      className={`transition-all space-y-2 border border-gray-100 ${
        isSelected ? "ring-2 ring-blue-500 ring-offset-1" : "hover:outline hover:outline-blue-200"
      }`}
    >
      <div className="w-10 h-10 rounded-xl bg-black text-white dark:bg-white dark:text-black flex items-center justify-center">
        <IconComp className="w-5 h-5" />
      </div>
      <h3 className="font-bold text-sm">{title}</h3>
      <p className="text-xs text-gray-500 leading-relaxed">{description}</p>
    </div>
  );
}
