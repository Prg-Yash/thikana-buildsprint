"use client";

import React from "react";
import { Star, ShieldCheck, Truck, Store, Sparkles } from "lucide-react";

const ICON_MAP = {
  star: Star,
  shield: ShieldCheck,
  truck: Truck,
  store: Store,
  sparkles: Sparkles,
};

export default function Features({ props = {}, styles = {}, isSelected = false, onClick, isEditable = false }) {
  const {
    heading = "Why Choose Us",
    subheading = "Quality products and service delivered with excellence.",
    items = [
      { icon: "star", title: "Handcrafted Quality", description: "Every item is made with care and high quality materials." },
      { icon: "shield", title: "Verified Seller", description: "Trusted local business with 100% genuine products." },
      { icon: "truck", title: "Fast Local Delivery", description: "Get your items delivered within hours across the city." },
    ],
  } = props;

  const containerStyle = {
    padding: styles.padding || "48px 24px",
    backgroundColor: styles.backgroundColor || "#FFFFFF",
    color: styles.textColor || "#1A1A1A",
  };

  return (
    <div
      onClick={onClick}
      style={containerStyle}
      className={`transition-all rounded-2xl my-2 ${
        isSelected ? "ring-2 ring-blue-500 ring-offset-2" : "hover:outline hover:outline-gray-300"
      }`}
    >
      <div className="max-w-5xl mx-auto space-y-8 text-center">
        <div>
          <h2 className="text-2xl sm:text-3xl font-extrabold" style={{ fontFamily: "var(--font-heading)" }}>
            {heading}
          </h2>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">{subheading}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
          {items.map((item, idx) => {
            const IconComp = ICON_MAP[item.icon] || Sparkles;
            return (
              <div
                key={idx}
                className="p-6 rounded-2xl border border-gray-100 bg-[#F7F6F3] dark:bg-[#222222] space-y-3 shadow-xs"
              >
                <div className="w-10 h-10 rounded-xl bg-black text-white dark:bg-white dark:text-black flex items-center justify-center">
                  <IconComp className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-base text-[#1A1A1A] dark:text-white">{item.title}</h3>
                <p className="text-xs text-gray-500 leading-relaxed">{item.description}</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
