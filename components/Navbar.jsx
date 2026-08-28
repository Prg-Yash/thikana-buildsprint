"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/context/ThemeContext";
import { Menu, X, Sun, Moon, Store, LogOut, User } from "lucide-react";

export default function Navbar() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-[#F7F6F3]/80 backdrop-blur-md border-b border-[#E5E0D8] transition-colors dark:bg-[#1A1A1A]/80 dark:border-white/10">
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 h-20 flex items-center justify-between">
        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-10 h-10 rounded-2xl bg-[#1A1A1A] text-white dark:bg-white dark:text-[#1A1A1A] flex items-center justify-center font-black text-xl tracking-tight transition-transform group-hover:scale-105">
            T
          </div>
          <span className="font-extrabold text-2xl tracking-tight text-[#1A1A1A] dark:text-white" style={{ fontFamily: "var(--font-heading)" }}>
            Thikana
          </span>
        </Link>

        {/* Navigation Links */}
        <nav className="hidden md:flex items-center gap-8 text-sm font-semibold text-[#555] dark:text-white/70">
          <Link href="#features" className="hover:text-[#1A1A1A] dark:hover:text-white transition-colors">
            Features
          </Link>
          <Link href="#modules" className="hover:text-[#1A1A1A] dark:hover:text-white transition-colors">
            Modules
          </Link>
          <Link href="#pricing" className="hover:text-[#1A1A1A] dark:hover:text-white transition-colors">
            Pricing
          </Link>
          <Link href="#tech" className="hover:text-[#1A1A1A] dark:hover:text-white transition-colors">
            Tech Stack
          </Link>
        </nav>

        {/* Action Buttons */}
        <div className="hidden md:flex items-center gap-4">
          <button
            onClick={toggleTheme}
            className="p-2.5 rounded-full border border-[#DDD8CF] dark:border-white/20 text-[#1A1A1A] dark:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
            aria-label="Toggle Theme"
          >
            {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          {user ? (
            <div className="flex items-center gap-3">
              <Link
                href="/feed"
                className="flex items-center gap-2 bg-[#1A1A1A] text-white dark:bg-white dark:text-[#1A1A1A] px-5 py-2.5 rounded-full text-xs font-bold hover:opacity-90 transition"
              >
                <User className="w-3.5 h-3.5" />
                {user.displayName || "Dashboard"}
              </Link>
              <button
                onClick={logout}
                className="p-2.5 rounded-full border border-[#DDD8CF] dark:border-white/20 text-[#888] hover:text-[#1A1A1A] dark:hover:text-white transition"
                title="Log out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <Link
                href="/login"
                className="text-xs font-bold px-5 py-2.5 rounded-full border border-[#DDD8CF] dark:border-white/20 text-[#1A1A1A] dark:text-white hover:bg-black/5 dark:hover:bg-white/10 transition"
              >
                Log In
              </Link>
              <Link
                href="/register"
                className="text-xs font-bold px-5 py-2.5 rounded-full bg-[#1A1A1A] text-white dark:bg-white dark:text-[#1A1A1A] hover:bg-[#333] dark:hover:bg-white/90 transition"
              >
                Get Started
              </Link>
            </div>
          )}
        </div>

        {/* Mobile menu toggle */}
        <div className="flex items-center gap-2 md:hidden">
          <button
            onClick={toggleTheme}
            className="p-2 rounded-full border border-[#DDD8CF] text-[#1A1A1A] dark:text-white"
          >
            {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 text-[#1A1A1A] dark:text-white"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-[#E5E0D8] dark:border-white/10 bg-[#F7F6F3] dark:bg-[#1A1A1A] px-6 py-6 space-y-4">
          <Link
            href="#features"
            onClick={() => setMobileMenuOpen(false)}
            className="block text-sm font-semibold text-[#555] dark:text-white/70"
          >
            Features
          </Link>
          <Link
            href="#modules"
            onClick={() => setMobileMenuOpen(false)}
            className="block text-sm font-semibold text-[#555] dark:text-white/70"
          >
            Modules
          </Link>
          <Link
            href="#pricing"
            onClick={() => setMobileMenuOpen(false)}
            className="block text-sm font-semibold text-[#555] dark:text-white/70"
          >
            Pricing
          </Link>
          <div className="pt-4 border-t border-[#E5E0D8] dark:border-white/10 flex flex-col gap-3">
            {user ? (
              <div className="flex flex-col gap-2">
                <Link
                  href="/feed"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full text-center py-3 rounded-full bg-[#1A1A1A] text-white text-xs font-bold"
                >
                  Dashboard
                </Link>
                <button
                  onClick={() => {
                    logout();
                    setMobileMenuOpen(false);
                  }}
                  className="w-full py-3 rounded-full border border-[#DDD8CF] text-xs font-bold text-[#888]"
                >
                  Log Out
                </button>
              </div>
            ) : (
              <>
                <Link
                  href="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full text-center py-3 rounded-full border border-[#DDD8CF] text-xs font-bold text-[#1A1A1A] dark:text-white"
                >
                  Log In
                </Link>
                <Link
                  href="/register"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full text-center py-3 rounded-full bg-[#1A1A1A] text-white dark:bg-white dark:text-[#1A1A1A] text-xs font-bold"
                >
                  Get Started
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
