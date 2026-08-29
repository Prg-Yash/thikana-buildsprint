"use client";

import React from "react";
import { MapPin, Phone, Clock } from "lucide-react";

export default function StoreMap({ props = {}, styles = {}, isSelected = false, onClick, isEditable = false }) {
  const {
    title = "Visit Our Store",
    address = "MG Road, Pune, Maharashtra 411001",
    phone = "+91 98765 43210",
    timing = "Mon - Sat: 10:00 AM - 9:00 PM",
    mapEmbedUrl = "",
  } = props;

  const containerStyle = {
    padding: styles.padding || "48px 24px",
    backgroundColor: styles.backgroundColor || "#F7F6F3",
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
      <div className="max-w-5xl mx-auto space-y-6">
        <h2 className="text-2xl font-extrabold text-center" style={{ fontFamily: "var(--font-heading)" }}>
          {title}
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
          {/* Store Info */}
          <div className="space-y-4 bg-white dark:bg-[#1A1A1A] p-6 rounded-2xl border border-gray-200 dark:border-white/10 shadow-xs">
            <div className="flex items-start gap-3">
              <MapPin className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <div>
                <span className="text-[10px] font-extrabold uppercase text-gray-400">Address</span>
                <p className="text-xs font-bold text-[#1A1A1A] dark:text-white mt-0.5">{address}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Phone className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <span className="text-[10px] font-extrabold uppercase text-gray-400">Phone</span>
                <p className="text-xs font-bold text-[#1A1A1A] dark:text-white mt-0.5">{phone}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Clock className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <span className="text-[10px] font-extrabold uppercase text-gray-400">Working Hours</span>
                <p className="text-xs font-bold text-[#1A1A1A] dark:text-white mt-0.5">{timing}</p>
              </div>
            </div>
          </div>

          {/* Embedded Map Container */}
          <div className="w-full h-64 rounded-2xl overflow-hidden border border-gray-200 dark:border-white/10 bg-gray-200 dark:bg-gray-800 relative">
            {mapEmbedUrl ? (
              <iframe
                src={mapEmbedUrl}
                width="100%"
                height="100%"
                style={{ border: 0 }}
                allowFullScreen=""
                loading="lazy"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center">
                <MapPin className="w-8 h-8 text-red-500 mb-2" />
                <p className="text-xs font-bold text-gray-600 dark:text-gray-300">
                  {address}
                </p>
                <span className="text-[10px] text-gray-400 mt-1">Interactive Google Map Placeholder</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
