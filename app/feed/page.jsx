"use client";

import React from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { Store, User, MapPin, Plus, LogOut, ArrowRight, CheckCircle2 } from "lucide-react";

export default function FeedPage() {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-[#F7F6F3] text-[#1A1A1A]" style={{ fontFamily: "var(--font-body)" }}>
      {/* Top Header */}
      <header className="bg-white border-b border-[#E5E0D8] px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#1A1A1A] text-white flex items-center justify-center font-black text-xl">
            T
          </div>
          <span className="font-extrabold text-xl tracking-tight" style={{ fontFamily: "var(--font-heading)" }}>
            Thikana Dashboard
          </span>
        </div>

        <div className="flex items-center gap-4">
          <span className="text-xs font-semibold text-[#666]">
            Signed in as <strong className="text-[#1A1A1A]">{user?.email || "User"}</strong>
          </span>
          <button
            onClick={logout}
            className="p-2 rounded-full border border-[#DDD] hover:bg-[#F0ECE6] transition text-[#666]"
            title="Sign out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-4xl mx-auto px-4 py-12 space-y-8">
        <div className="bg-white rounded-[28px] p-8 border border-[#E5E0D8] shadow-sm">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 rounded-full bg-[#C8B99A]/20 border border-[#C8B99A] flex items-center justify-center text-[#1A1A1A] font-black text-2xl">
              {user?.displayName ? user.displayName.charAt(0).toUpperCase() : "U"}
            </div>
            <div>
              <h1 className="text-2xl font-black text-[#1A1A1A]" style={{ fontFamily: "var(--font-heading)" }}>
                Welcome, {user?.displayName || "Entrepreneur"}!
              </h1>
              <p className="text-xs text-[#888] mt-1">Account Type: <span className="font-bold uppercase text-[#C8B99A]">{user?.accountType || "Business"}</span></p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-[#EEEAE4] flex items-center gap-3 mb-8">
            <CheckCircle2 className="w-5 h-5 text-[#4A7C6F] shrink-0" />
            <p className="text-xs font-medium text-[#444]">
              Your Thikana authentication is configured and active. You can now access no-code tools, business profiles, and payment settings.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Link
              href="/register/business"
              className="p-6 rounded-2xl border border-[#DDD] hover:border-[#1A1A1A] transition bg-[#F7F6F3] flex flex-col justify-between group"
            >
              <div>
                <Store className="w-6 h-6 text-[#1A1A1A] mb-3" />
                <h3 className="font-bold text-base mb-1">Business Profile Setup</h3>
                <p className="text-xs text-[#777]">Add or update your business location, category, and phone number.</p>
              </div>
              <span className="text-xs font-bold text-[#1A1A1A] flex items-center gap-1 mt-6 group-hover:translate-x-1 transition-transform">
                Configure Profile <ArrowRight className="w-3.5 h-3.5" />
              </span>
            </Link>

            <Link
              href="/"
              className="p-6 rounded-2xl border border-[#DDD] hover:border-[#1A1A1A] transition bg-[#F7F6F3] flex flex-col justify-between group"
            >
              <div>
                <MapPin className="w-6 h-6 text-[#1A1A1A] mb-3" />
                <h3 className="font-bold text-base mb-1">Explore Landing Page</h3>
                <p className="text-xs text-[#777]">Return to the main landing page to view features, pricing, and showcase.</p>
              </div>
              <span className="text-xs font-bold text-[#1A1A1A] flex items-center gap-1 mt-6 group-hover:translate-x-1 transition-transform">
                Go to Landing <ArrowRight className="w-3.5 h-3.5" />
              </span>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
