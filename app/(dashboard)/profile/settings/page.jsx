"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "@/lib/firebase";
import {
  User,
  Settings,
  MapPin,
  Save,
  Lock,
  Store,
  CreditCard,
  Building2,
  Shield,
  FileText,
} from "lucide-react";
import toast from "react-hot-toast";
import RazorpaySettingsTab from "@/components/dashboard/RazorpaySettingsTab";
import BusinessInfoForm from "@/components/dashboard/BusinessInfoForm";

export default function SettingsPage() {
  const { user } = useAuth();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState("general"); // 'general' | 'business_info' | 'razorpay'

  const [displayName, setDisplayName] = useState("");
  const [phone, setPhone] = useState("");
  const [bio, setBio] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [businessType, setBusinessType] = useState("Retail");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sendingReset, setSendingReset] = useState(false);

  useEffect(() => {
    async function loadSettingsData() {
      if (!user?.uid) return;
      try {
        // Fetch User doc
        const userDocSnap = await getDoc(doc(db, "users", user.uid));
        if (userDocSnap.exists()) {
          const data = userDocSnap.data();
          setDisplayName(data.displayName || user.displayName || "");
          setPhone(data.phone || "");
          setBio(data.bio || "");
        }

        // Fetch Business doc
        const bizDocSnap = await getDoc(doc(db, "businesses", user.uid));
        if (bizDocSnap.exists()) {
          const bData = bizDocSnap.data();
          setBusinessName(bData.businessName || "");
          setBusinessType(bData.business_type || "Retail");
        }
      } catch (err) {
        console.error("Error loading settings:", err);
      }
    }

    loadSettingsData();
  }, [user]);

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!user?.uid) return;

    setIsSubmitting(true);
    try {
      // 1. Update user document in Firestore
      const userRef = doc(db, "users", user.uid);
      await setDoc(
        userRef,
        {
          displayName: displayName.trim(),
          phone: phone.trim(),
          bio: bio.trim(),
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );

      // 2. Update business document in Firestore if business account
      if (businessName.trim()) {
        const bizRef = doc(db, "businesses", user.uid);
        await setDoc(
          bizRef,
          {
            businessName: businessName.trim(),
            business_type: businessType,
            phone: phone.trim(),
            updatedAt: new Date().toISOString(),
          },
          { merge: true }
        );
      }

      toast.success("Profile settings updated successfully!");
    } catch (err) {
      console.error("Error saving settings:", err);
      toast.error(err.message || "Failed to update profile settings");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendPasswordReset = async () => {
    if (!user?.email) return;
    setSendingReset(true);
    try {
      await sendPasswordResetEmail(auth, user.email);
      toast.success(`Password reset email sent to ${user.email}`);
    } catch (err) {
      console.error("Password reset error:", err);
      toast.error(err.message || "Failed to send password reset email.");
    } finally {
      setSendingReset(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div>
        <h1
          className="text-2xl sm:text-3xl font-black text-[#1A1A1A] dark:text-white tracking-tight"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          Account & Merchant Settings
        </h1>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          Manage your account profile, merchant branding, enterprise metadata, and payment gateway integrations.
        </p>
      </div>

      {/* Settings Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-[#E5E0D8] dark:border-white/10 pb-1">
        <button
          onClick={() => setActiveTab("general")}
          className={`px-4 py-2.5 rounded-2xl font-extrabold text-xs transition flex items-center gap-2 ${
            activeTab === "general"
              ? "bg-[#1A1A1A] text-white dark:bg-white dark:text-[#1A1A1A] shadow-xs"
              : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5"
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>General Profile & Store</span>
        </button>

        <button
          onClick={() => setActiveTab("business_info")}
          className={`px-4 py-2.5 rounded-2xl font-extrabold text-xs transition flex items-center gap-2 ${
            activeTab === "business_info"
              ? "bg-[#1A1A1A] text-white dark:bg-white dark:text-[#1A1A1A] shadow-xs"
              : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5"
          }`}
        >
          <FileText className="w-4 h-4 text-blue-500" />
          <span>Business Information</span>
        </button>

        <button
          onClick={() => setActiveTab("razorpay")}
          className={`px-4 py-2.5 rounded-2xl font-extrabold text-xs transition flex items-center gap-2 ${
            activeTab === "razorpay"
              ? "bg-[#1A1A1A] text-white dark:bg-white dark:text-[#1A1A1A] shadow-xs"
              : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5"
          }`}
        >
          <CreditCard className="w-4 h-4 text-amber-500" />
          <span>Razorpay Integration</span>
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === "general" ? (
        <form onSubmit={handleSaveProfile} className="space-y-6">
          {/* 1. Account Details Card */}
          <div className="bg-white dark:bg-[#1A1A1A] rounded-3xl border border-[#E5E0D8] dark:border-white/10 p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-2 text-sm font-bold text-[#1A1A1A] dark:text-white pb-2 border-b border-[#E5E0D8] dark:border-white/10">
              <User className="w-4 h-4 text-[#C8B99A]" />
              <span>Personal Profile</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase text-gray-600 dark:text-gray-400 mb-1">
                  Display Name
                </label>
                <input
                  type="text"
                  required
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full bg-[#F7F6F3] dark:bg-[#262626] border border-[#DDD8CF] dark:border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-[#1A1A1A] dark:text-white outline-none focus:border-[#1A1A1A]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-gray-600 dark:text-gray-400 mb-1">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="w-full bg-[#F7F6F3] dark:bg-[#262626] border border-[#DDD8CF] dark:border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-[#1A1A1A] dark:text-white outline-none focus:border-[#1A1A1A]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-gray-600 dark:text-gray-400 mb-1">
                Bio / Description
              </label>
              <textarea
                rows={3}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Short description about yourself or your store..."
                className="w-full bg-[#F7F6F3] dark:bg-[#262626] border border-[#DDD8CF] dark:border-white/10 rounded-xl p-3 text-xs text-[#1A1A1A] dark:text-white outline-none focus:border-[#1A1A1A] resize-none"
              />
            </div>
          </div>

          {/* 2. Merchant Branding Card */}
          <div className="bg-white dark:bg-[#1A1A1A] rounded-3xl border border-[#E5E0D8] dark:border-white/10 p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-2 text-sm font-bold text-[#1A1A1A] dark:text-white pb-2 border-b border-[#E5E0D8] dark:border-white/10">
              <Store className="w-4 h-4 text-[#C8B99A]" />
              <span>Store & Merchant Details</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase text-gray-600 dark:text-gray-400 mb-1">
                  Business Name
                </label>
                <input
                  type="text"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="e.g. Metro Trends Boutique"
                  className="w-full bg-[#F7F6F3] dark:bg-[#262626] border border-[#DDD8CF] dark:border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-[#1A1A1A] dark:text-white outline-none focus:border-[#1A1A1A]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-gray-600 dark:text-gray-400 mb-1">
                  Business Category
                </label>
                <select
                  value={businessType}
                  onChange={(e) => setBusinessType(e.target.value)}
                  className="w-full bg-[#F7F6F3] dark:bg-[#262626] border border-[#DDD8CF] dark:border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-[#1A1A1A] dark:text-white outline-none focus:border-[#1A1A1A]"
                >
                  <option value="Retail">Retail & Shopping</option>
                  <option value="Restaurant">Restaurant & Cafe</option>
                  <option value="Fashion">Fashion & Apparel</option>
                  <option value="Fitness">Fitness & Health</option>
                  <option value="Education">Education & Coaching</option>
                  <option value="Services">Services & Repair</option>
                </select>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-between">
              <span className="text-xs text-gray-500">Calibrate store location on Google Maps</span>
              <button
                type="button"
                onClick={() => router.push("/map")}
                className="px-3.5 py-2 rounded-xl bg-[#F7F6F3] dark:bg-[#262626] border border-[#DDD8CF] dark:border-white/10 text-xs font-bold text-[#1A1A1A] dark:text-white hover:bg-gray-200 transition flex items-center gap-1.5"
              >
                <MapPin className="w-3.5 h-3.5 text-red-500" /> Map Setup
              </button>
            </div>
          </div>

          {/* 3. Security & Password Reset Card */}
          <div className="bg-white dark:bg-[#1A1A1A] rounded-3xl border border-[#E5E0D8] dark:border-white/10 p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-2 text-sm font-bold text-[#1A1A1A] dark:text-white pb-2 border-b border-[#E5E0D8] dark:border-white/10">
              <Lock className="w-4 h-4 text-[#C8B99A]" />
              <span>Security & Password</span>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-[#1A1A1A] dark:text-white">Reset Password</p>
                <p className="text-[11px] text-gray-500">Send password reset email to {user?.email}</p>
              </div>
              <button
                type="button"
                onClick={handleSendPasswordReset}
                disabled={sendingReset}
                className="px-4 py-2 rounded-xl border border-[#DDD8CF] dark:border-white/10 text-xs font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5 transition"
              >
                {sendingReset ? "Sending..." : "Send Reset Email"}
              </button>
            </div>
          </div>

          {/* Save Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-4 rounded-2xl bg-[#1A1A1A] hover:bg-black dark:bg-white dark:hover:bg-gray-100 text-white dark:text-[#1A1A1A] font-extrabold text-sm transition shadow-md flex items-center justify-center gap-2"
          >
            <Save className="w-4 h-4" />
            <span>{isSubmitting ? "Saving Changes..." : "Save Profile Settings"}</span>
          </button>
        </form>
      ) : activeTab === "business_info" ? (
        <BusinessInfoForm readOnly={false} />
      ) : (
        <RazorpaySettingsTab />
      )}
    </div>
  );
}
