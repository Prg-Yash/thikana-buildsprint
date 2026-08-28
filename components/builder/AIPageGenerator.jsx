"use client";

import React, { useState, useEffect } from "react";
import { useBuilderStore } from "@/lib/stores/builderStore";
import { useBusiness } from "@/context/BusinessContext";
import toast from "react-hot-toast";
import { Sparkles, Loader2, Wand2, X, Store, MapPin, Tag, Phone } from "lucide-react";

export default function AIPageGenerator({ isOpen, onClose }) {
  const { business } = useBusiness();
  const { setLayout, setTheme } = useBuilderStore();

  const [businessType, setBusinessType] = useState("");
  const [colorPreference, setColorPreference] = useState("Modern Dark");
  const [isGenerating, setIsGenerating] = useState(false);

  // Auto-prefill business details from BusinessContext on load/open
  useEffect(() => {
    if (business) {
      const bName = business.businessName || "";
      const bCategory = business.category || "";
      const bLoc = business.location || business.address?.formatted || "";
      if (bName) {
        setBusinessType(`${bName} (${bCategory}${bLoc ? ` - ${bLoc}` : ""})`);
      }
    }
  }, [business, isOpen]);

  if (!isOpen) return null;

  const handleGenerate = (e) => {
    e.preventDefault();
    if (!businessType.trim()) {
      toast.error("Please enter a business type or description");
      return;
    }

    setIsGenerating(true);

    setTimeout(() => {
      const promptName = businessType.trim();
      const storeName = business?.businessName || promptName.split(" ")[0] + " Store";
      const storeCategory = business?.category || "Retail";
      const storeAddress = business?.address?.formatted || business?.location || `${promptName}, Main Market Road`;
      const storePhone = business?.phone || "+91 98765 43210";

      const generatedLayout = [
        {
          id: `nav-${Date.now()}`,
          type: "NavbarSection",
          props: {
            brandName: storeName,
            links: [
              { label: "Home", href: "#hero" },
              { label: "Story", href: "#features" },
              { label: "Catalog", href: "#pricing" },
              { label: "Visit Us", href: "#map" },
            ],
          },
          styles: { padding: "16px 24px", backgroundColor: "#FFFFFF", textColor: "#1A1A1A" },
        },
        {
          id: `hero-${Date.now() + 1}`,
          type: "HeroSection",
          props: {
            title: `Welcome to ${storeName}`,
            subtitle: `Discover authentic ${storeCategory.toLowerCase()} handcrafted locally for you.`,
            ctaText: "Explore Offers",
            ctaLink: "#pricing",
          },
          styles: { padding: "72px 24px", backgroundColor: "#1A1A1A", textColor: "#FFFFFF" },
        },
        {
          id: `feat-${Date.now() + 2}`,
          type: "FeaturesSection",
          props: {
            heading: "Why Choose Our Store",
            subheading: `Serving excellence across ${storeAddress.split(",")[0] || "your city"}`,
            items: [
              { icon: "star", title: "Handcrafted Quality", description: "Top grade items crafted with precision and care." },
              { icon: "sparkles", title: "Authentic & Verified", description: "Verified local business with genuine products." },
              { icon: "truck", title: "Express Local Delivery", description: "Get your orders delivered right to your doorstep." },
            ],
          },
          styles: { padding: "56px 24px", backgroundColor: "#FFFFFF", textColor: "#1A1A1A" },
        },
        {
          id: `pricing-${Date.now() + 3}`,
          type: "PricingSection",
          props: {
            heading: "Featured Packages & Offers",
            tiers: [
              {
                name: "Essentials Bundle",
                price: "₹499",
                description: "Popular everyday selection for local customers.",
                features: ["Freshly Prepared", "Doorstep Delivery"],
              },
              {
                name: "Deluxe Premium Box",
                price: "₹1,299",
                description: "Curated collection with premium packaging.",
                features: ["Custom Packaging", "Same-Day Priority Delivery", "Special Gift Box"],
                popular: true,
              },
            ],
          },
          styles: { padding: "56px 24px", backgroundColor: "#FFFFFF", textColor: "#1A1A1A" },
        },
        {
          id: `map-${Date.now() + 4}`,
          type: "MapSection",
          props: {
            title: "Visit Our Store Location",
            address: storeAddress,
            phone: storePhone,
            timing: "Mon - Sat: 10:00 AM - 9:00 PM",
          },
          styles: { padding: "56px 24px", backgroundColor: "#F7F6F3", textColor: "#1A1A1A" },
        },
        {
          id: `cta-${Date.now() + 5}`,
          type: "CTASection",
          props: {
            title: `Connect With ${storeName}`,
            subtitle: "Subscribe for seasonal discounts, fresh arrivals, and local community drops.",
            buttonText: "Claim Opening Discount",
            buttonLink: "#subscribe",
          },
          styles: { padding: "56px 24px", backgroundColor: "#1A1A1A", textColor: "#FFFFFF" },
        },
        {
          id: `footer-${Date.now() + 6}`,
          type: "FooterSection",
          props: {
            tagline: `Empowering ${storeName} with digital storefronts.`,
            copyright: `© ${new Date().getFullYear()} ${storeName}. All rights reserved.`,
          },
          styles: { padding: "32px 24px", backgroundColor: "#1A1A1A", textColor: "#888888" },
        },
      ];

      let primaryColor = "#1A1A1A";
      let secondaryColor = "#F7F6F3";
      if (colorPreference === "Warm Earthy") {
        primaryColor = "#2D241E";
        secondaryColor = "#F5EFEB";
      } else if (colorPreference === "Emerald Fresh") {
        primaryColor = "#0F2C23";
        secondaryColor = "#F0F7F4";
      }

      setLayout(generatedLayout);
      setTheme({ primaryColor, secondaryColor });

      setIsGenerating(false);
      toast.success("AI Storefront generated!");
      onClose();
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-[#1A1A1A] w-full max-w-lg rounded-3xl border border-[#E5E0D8] dark:border-white/10 p-6 shadow-2xl relative space-y-6">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full text-gray-400 hover:text-black dark:hover:text-white transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-[#1A1A1A] text-white dark:bg-white dark:text-[#1A1A1A] flex items-center justify-center shrink-0">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <h2
              className="text-xl font-extrabold text-[#1A1A1A] dark:text-white"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              AI Storefront Generator
            </h2>
            <p className="text-xs text-gray-500">
              Draft a customized storefront using your registered business profile.
            </p>
          </div>
        </div>

        {/* Existing Business Profile Info Card */}
        {business && (
          <div className="p-4 rounded-2xl bg-[#F7F6F3] dark:bg-[#252525] border border-[#E5E0D8] dark:border-white/10 space-y-2">
            <span className="text-[10px] uppercase font-extrabold text-gray-400 tracking-wider">
              Detected Business Profile
            </span>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex items-center gap-1.5 font-bold text-[#1A1A1A] dark:text-white truncate">
                <Store className="w-3.5 h-3.5 text-gray-500 shrink-0" />
                <span className="truncate">{business.businessName || "Registered Store"}</span>
              </div>
              <div className="flex items-center gap-1.5 font-bold text-gray-600 dark:text-gray-300 truncate">
                <Tag className="w-3.5 h-3.5 text-gray-500 shrink-0" />
                <span className="truncate">{business.category || "Retail"}</span>
              </div>
              <div className="flex items-center gap-1.5 text-gray-500 truncate col-span-2">
                <MapPin className="w-3.5 h-3.5 text-red-500 shrink-0" />
                <span className="truncate">
                  {business.address?.formatted || business.location || "Location not configured"}
                </span>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleGenerate} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-[#1A1A1A] dark:text-white uppercase tracking-wider mb-2">
              Business Description / Vibe Prompt
            </label>
            <input
              type="text"
              value={businessType}
              onChange={(e) => setBusinessType(e.target.value)}
              placeholder="e.g. Artisanal Coffee & Roastery in Bandra"
              className="w-full bg-[#F7F6F3] dark:bg-[#252525] border border-gray-200 dark:border-white/10 focus:border-[#1A1A1A] dark:focus:border-white rounded-2xl py-3.5 px-4 text-sm font-medium text-[#1A1A1A] dark:text-white placeholder-gray-400 outline-none transition"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#1A1A1A] dark:text-white uppercase tracking-wider mb-2">
              Color Theme Preference
            </label>
            <select
              value={colorPreference}
              onChange={(e) => setColorPreference(e.target.value)}
              className="w-full bg-[#F7F6F3] dark:bg-[#252525] border border-gray-200 dark:border-white/10 focus:border-[#1A1A1A] dark:focus:border-white rounded-2xl py-3.5 px-4 text-sm font-medium text-[#1A1A1A] dark:text-white outline-none cursor-pointer"
            >
              <option value="Modern Dark">Modern Dark & Minimal</option>
              <option value="Warm Earthy">Warm Earthy & Artisanal</option>
              <option value="Emerald Fresh">Emerald Fresh & Organic</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={isGenerating}
            className="w-full bg-[#1A1A1A] text-white dark:bg-white dark:text-[#1A1A1A] py-4 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 hover:opacity-90 transition shadow-md disabled:opacity-50"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Generating Storefront Layout...
              </>
            ) : (
              <>
                <Wand2 className="w-4 h-4" /> Generate Storefront Layout
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
