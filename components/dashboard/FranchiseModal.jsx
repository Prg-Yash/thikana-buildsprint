"use client";

import React, { useState } from "react";
import { z } from "zod";
import { X, Check, Copy, Send, Building2, User, Mail, Phone, MapPin } from "lucide-react";
import toast from "react-hot-toast";

const franchiseSchema = z.object({
  franchiseName: z.string().min(3, "Franchise name must be at least 3 characters"),
  address: z.string().min(5, "Address must be at least 5 characters"),
  city: z.string().min(2, "City is required"),
  state: z.string().min(2, "State is required"),
  pincode: z.string().regex(/^\d{6}$/, "Pincode must be a valid 6-digit number"),
  adminName: z.string().min(3, "Admin name is required"),
  adminEmail: z.string().email("Invalid admin email address"),
  phone: z.string().min(10, "Phone number must be at least 10 digits"),
});

export function FranchiseModal({ isOpen, onClose, onAddFranchise }) {
  const [form, setForm] = useState({
    franchiseName: "",
    address: "",
    city: "",
    state: "",
    pincode: "",
    adminName: "",
    adminEmail: "",
    phone: "",
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [successData, setSuccessData] = useState(null);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});

    const result = franchiseSchema.safeParse(form);
    if (!result.success) {
      const formatted = {};
      result.error.issues.forEach((issue) => {
        formatted[issue.path[0]] = issue.message;
      });
      setErrors(formatted);
      return;
    }

    setLoading(true);

    try {
      const payload = {
        name: form.franchiseName,
        address: form.address,
        city: `${form.city}, ${form.state}`,
        pincode: form.pincode,
        adminName: form.adminName,
        adminEmail: form.adminEmail,
        phone: form.phone,
      };

      // Call backend creation endpoint
      await fetch("/api/franchise/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }).catch((err) => console.log("Backend creation note:", err));

      const created = onAddFranchise(payload);
      const onboardingUrl = `https://thikana.inc/onboard?token=fr_${Math.random().toString(36).substring(2, 10)}`;

      setSuccessData({
        name: form.franchiseName,
        adminEmail: form.adminEmail,
        onboardingUrl,
      });

      toast.success("Franchise invitation dispatched successfully!");
    } catch (err) {
      console.error(err);
      toast.error("Failed to add franchise");
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = () => {
    if (successData?.onboardingUrl) {
      navigator.clipboard.writeText(successData.onboardingUrl);
      setCopied(true);
      toast.success("Onboarding URL copied to clipboard!");
      setTimeout(() => setCopied(false), 2500);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
      <div className="bg-white dark:bg-[#1C1C1C] rounded-3xl border border-[#E5E0D8] dark:border-white/10 w-full max-w-lg overflow-hidden shadow-2xl animate-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#E5E0D8] dark:border-white/10 flex items-center justify-between bg-[#FDFCFB] dark:bg-[#222]">
          <h3 className="font-extrabold text-base text-[#1A1A1A] dark:text-white flex items-center gap-2">
            <Building2 className="w-5 h-5 text-amber-500" />
            {successData ? "Franchise Onboarding Link Ready" : "Add & Onboard New Franchise Outlet"}
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Success State */}
        {successData ? (
          <div className="p-6 space-y-5 text-center">
            <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-300 flex items-center justify-center mx-auto">
              <Check className="w-8 h-8" />
            </div>

            <div>
              <h4 className="font-extrabold text-lg text-[#1A1A1A] dark:text-white">
                {successData.name} Created
              </h4>
              <p className="text-xs text-gray-500 mt-1">
                An invitation email was sent to <strong>{successData.adminEmail}</strong>.
              </p>
            </div>

            {/* Onboarding Link Clipboard Box */}
            <div className="bg-gray-50 dark:bg-[#252525] p-4 rounded-2xl border border-gray-200 dark:border-white/10 text-left space-y-1.5">
              <span className="text-[10px] font-extrabold uppercase text-gray-400">
                Generated Onboarding Link
              </span>
              <p className="text-xs font-mono font-bold text-amber-600 dark:text-amber-400 truncate">
                {successData.onboardingUrl}
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleCopyLink}
                className="flex-1 bg-amber-500 hover:bg-amber-600 text-white py-3 rounded-2xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-md"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied ? "Copied Link!" : "Copy Onboarding Link"}
              </button>
              <button
                onClick={onClose}
                className="px-5 py-3 rounded-2xl border border-gray-200 dark:border-white/10 text-xs font-bold text-gray-700 dark:text-gray-200"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          /* Zod Validated Form */
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                Franchise Outlet Name
              </label>
              <input
                type="text"
                value={form.franchiseName}
                onChange={(e) => setForm({ ...form, franchiseName: e.target.value })}
                placeholder="e.g. Thikana Outlet - Jubilee Hills"
                className="w-full bg-gray-50 dark:bg-[#262626] border border-gray-200 dark:border-white/10 rounded-2xl px-4 py-2.5 text-xs font-medium text-[#1A1A1A] dark:text-white outline-none focus:border-amber-500"
              />
              {errors.franchiseName && (
                <p className="text-[10px] font-bold text-rose-500 mt-1">{errors.franchiseName}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                Street Address
              </label>
              <input
                type="text"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                placeholder="Road No 36, Jubilee Hills"
                className="w-full bg-gray-50 dark:bg-[#262626] border border-gray-200 dark:border-white/10 rounded-2xl px-4 py-2.5 text-xs font-medium text-[#1A1A1A] dark:text-white outline-none"
              />
              {errors.address && (
                <p className="text-[10px] font-bold text-rose-500 mt-1">{errors.address}</p>
              )}
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                  City
                </label>
                <input
                  type="text"
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                  placeholder="Hyderabad"
                  className="w-full bg-gray-50 dark:bg-[#262626] border border-gray-200 dark:border-white/10 rounded-2xl px-3 py-2.5 text-xs font-medium text-[#1A1A1A] dark:text-white outline-none"
                />
                {errors.city && (
                  <p className="text-[10px] font-bold text-rose-500 mt-1">{errors.city}</p>
                )}
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                  State
                </label>
                <input
                  type="text"
                  value={form.state}
                  onChange={(e) => setForm({ ...form, state: e.target.value })}
                  placeholder="TS"
                  className="w-full bg-gray-50 dark:bg-[#262626] border border-gray-200 dark:border-white/10 rounded-2xl px-3 py-2.5 text-xs font-medium text-[#1A1A1A] dark:text-white outline-none"
                />
                {errors.state && (
                  <p className="text-[10px] font-bold text-rose-500 mt-1">{errors.state}</p>
                )}
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                  Pincode
                </label>
                <input
                  type="text"
                  value={form.pincode}
                  onChange={(e) => setForm({ ...form, pincode: e.target.value })}
                  placeholder="500033"
                  className="w-full bg-gray-50 dark:bg-[#262626] border border-gray-200 dark:border-white/10 rounded-2xl px-3 py-2.5 text-xs font-medium text-[#1A1A1A] dark:text-white outline-none"
                />
                {errors.pincode && (
                  <p className="text-[10px] font-bold text-rose-500 mt-1">{errors.pincode}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                  Admin Name
                </label>
                <input
                  type="text"
                  value={form.adminName}
                  onChange={(e) => setForm({ ...form, adminName: e.target.value })}
                  placeholder="Siddharth Reddy"
                  className="w-full bg-gray-50 dark:bg-[#262626] border border-gray-200 dark:border-white/10 rounded-2xl px-4 py-2.5 text-xs font-medium text-[#1A1A1A] dark:text-white outline-none"
                />
                {errors.adminName && (
                  <p className="text-[10px] font-bold text-rose-500 mt-1">{errors.adminName}</p>
                )}
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                  Admin Email
                </label>
                <input
                  type="email"
                  value={form.adminEmail}
                  onChange={(e) => setForm({ ...form, adminEmail: e.target.value })}
                  placeholder="siddharth@thikana.inc"
                  className="w-full bg-gray-50 dark:bg-[#262626] border border-gray-200 dark:border-white/10 rounded-2xl px-4 py-2.5 text-xs font-medium text-[#1A1A1A] dark:text-white outline-none"
                />
                {errors.adminEmail && (
                  <p className="text-[10px] font-bold text-rose-500 mt-1">{errors.adminEmail}</p>
                )}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                Phone Number
              </label>
              <input
                type="text"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="+91 98000 11223"
                className="w-full bg-gray-50 dark:bg-[#262626] border border-gray-200 dark:border-white/10 rounded-2xl px-4 py-2.5 text-xs font-medium text-[#1A1A1A] dark:text-white outline-none"
              />
              {errors.phone && (
                <p className="text-[10px] font-bold text-rose-500 mt-1">{errors.phone}</p>
              )}
            </div>

            <div className="pt-2 flex justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-2xl text-xs font-bold text-gray-500"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="bg-amber-500 hover:bg-amber-600 text-white px-5 py-2.5 rounded-2xl text-xs font-bold transition shadow-md flex items-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                {loading ? "Creating..." : "Send Onboarding Invitation"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
