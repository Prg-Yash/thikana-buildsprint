"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { doc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import toast from "react-hot-toast";
import { Store, MapPin, Tag, Phone, ArrowRight, Loader2 } from "lucide-react";

export default function BusinessRegistration() {
  const [businessName, setBusinessName] = useState("");
  const [category, setCategory] = useState("Retail");
  const [location, setLocation] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!businessName || !location || !phone) {
      toast.error("Please complete all business details");
      return;
    }

    setLoading(true);
    try {
      if (user) {
        await setDoc(doc(db, "businesses", user.uid), {
          ownerId: user.uid,
          businessName,
          category,
          location,
          phone,
          createdAt: new Date().toISOString(),
          status: "active",
        });
        // Also update user's profile doc
        await setDoc(doc(db, "users", user.uid), { businessRegistered: true }, { merge: true });
      }

      toast.success("Business profile created!");
      router.push("/feed");
    } catch (err) {
      toast.error(err.message || "Failed to save business profile");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Business Name */}
      <div>
        <label className="block text-xs font-bold text-[#1A1A1A] uppercase tracking-wider mb-2">
          Business Name
        </label>
        <div className="relative">
          <Store className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#888]" />
          <input
            type="text"
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            placeholder="Glow Salon & Spa"
            className="w-full bg-white border border-[#DDD8CF] focus:border-[#1A1A1A] rounded-2xl py-3.5 pl-11 pr-4 text-sm font-medium text-[#1A1A1A] placeholder:text-[#AAA] outline-none transition-colors"
            required
          />
        </div>
      </div>

      {/* Category */}
      <div>
        <label className="block text-xs font-bold text-[#1A1A1A] uppercase tracking-wider mb-2">
          Category
        </label>
        <div className="relative">
          <Tag className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#888]" />
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full bg-white border border-[#DDD8CF] focus:border-[#1A1A1A] rounded-2xl py-3.5 pl-11 pr-4 text-sm font-medium text-[#1A1A1A] outline-none transition-colors appearance-none cursor-pointer"
          >
            <option value="Retail">Retail & Store</option>
            <option value="Salon & Spa">Salon & Wellness</option>
            <option value="Restaurant & Cafe">Restaurant & Cafe</option>
            <option value="Healthcare">Healthcare & Clinic</option>
            <option value="Home Services">Home & Repair Services</option>
            <option value="Education">Education & Coaching</option>
            <option value="Other">Other</option>
          </select>
        </div>
      </div>

      {/* Location */}
      <div>
        <label className="block text-xs font-bold text-[#1A1A1A] uppercase tracking-wider mb-2">
          Location / City
        </label>
        <div className="relative">
          <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#888]" />
          <input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="MG Road, Pune"
            className="w-full bg-white border border-[#DDD8CF] focus:border-[#1A1A1A] rounded-2xl py-3.5 pl-11 pr-4 text-sm font-medium text-[#1A1A1A] placeholder:text-[#AAA] outline-none transition-colors"
            required
          />
        </div>
      </div>

      {/* Phone Number */}
      <div>
        <label className="block text-xs font-bold text-[#1A1A1A] uppercase tracking-wider mb-2">
          Contact Phone Number
        </label>
        <div className="relative">
          <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#888]" />
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+91 98765 43210"
            className="w-full bg-white border border-[#DDD8CF] focus:border-[#1A1A1A] rounded-2xl py-3.5 pl-11 pr-4 text-sm font-medium text-[#1A1A1A] placeholder:text-[#AAA] outline-none transition-colors"
            required
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-[#1A1A1A] text-white py-4 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 hover:bg-[#333] transition disabled:opacity-60 shadow-md mt-6"
      >
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <>
            Complete Registration <ArrowRight className="w-4 h-4" />
          </>
        )}
      </button>
    </form>
  );
}
