"use client";

import React from "react";
import { Check, ShoppingBag } from "lucide-react";

export default function PricingCard({ props = {}, styles = {}, isSelected = false, onClick, isEditable = false }) {
  const {
    heading = "Store Catalog & Pricing",
    tiers = [
      {
        name: "Basic Package",
        price: "₹499",
        description: "Essential local products for everyday use.",
        features: ["Standard Packaging", "Local Delivery Included", "Quality Guarantee"],
      },
      {
        name: "Premium Collection",
        price: "₹1,299",
        description: "Curated premium items crafted with precision.",
        features: ["Custom Packaging", "Same-Day Delivery", "Priority Support", "Special Gift Box"],
        popular: true,
      },
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
      <div className="max-w-4xl mx-auto space-y-8">
        <h2 className="text-2xl sm:text-3xl font-extrabold text-center" style={{ fontFamily: "var(--font-heading)" }}>
          {heading}
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {tiers.map((tier, idx) => (
            <div
              key={idx}
              className={`p-6 rounded-3xl border ${
                tier.popular
                  ? "border-[#1A1A1A] bg-[#1A1A1A] text-white shadow-xl"
                  : "border-gray-200 bg-[#F7F6F3] text-[#1A1A1A]"
              } space-y-4 flex flex-col justify-between`}
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="font-extrabold text-lg">{tier.name}</h3>
                  {tier.popular && (
                    <span className="bg-white text-black text-[10px] uppercase font-black px-2.5 py-1 rounded-full">
                      Popular
                    </span>
                  )}
                </div>
                <div className="text-3xl font-black">{tier.price}</div>
                <p className="text-xs opacity-80">{tier.description}</p>
              </div>

              <ul className="space-y-2 text-xs font-semibold pt-4 border-t border-gray-200/20">
                {tier.features?.map((feat, fIdx) => (
                  <li key={fIdx} className="flex items-center gap-2">
                    <Check className="w-4 h-4 shrink-0 text-emerald-500" />
                    <span>{feat}</span>
                  </li>
                ))}
              </ul>

              <button
                onClick={(e) => isEditable && e.preventDefault()}
                className={`w-full py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 ${
                  tier.popular
                    ? "bg-white text-black hover:bg-gray-100"
                    : "bg-[#1A1A1A] text-white hover:bg-black/80"
                } transition`}
              >
                <ShoppingBag className="w-4 h-4" /> Order Package
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
