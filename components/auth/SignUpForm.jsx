"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import toast from "react-hot-toast";
import { User, Mail, Lock, ArrowRight, Loader2, Store, UserCheck } from "lucide-react";

export function SignUpForm() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [accountType, setAccountType] = useState("business"); // default business for Thikana onboarding
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const { signup, loginWithGoogle } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!fullName || !email || !password) {
      toast.error("Please fill in all fields");
      return;
    }
    setLoading(true);
    try {
      await signup(email, password, fullName, accountType);
      toast.success("Account created successfully!");
      if (accountType === "business") {
        router.push("/register/business");
      } else {
        router.push("/feed");
      }
    } catch (err) {
      toast.error(err.message || "Failed to create account");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignup = async () => {
    setGoogleLoading(true);
    try {
      await loginWithGoogle();
      toast.success("Signed up with Google!");
      router.push("/register/business");
    } catch (err) {
      toast.error(err.message || "Google sign-up failed");
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Account Type Selector */}
      <div className="grid grid-cols-2 gap-3 p-1 bg-[#EEEAE4] rounded-2xl">
        <button
          type="button"
          onClick={() => setAccountType("business")}
          className={`py-2.5 px-4 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 ${
            accountType === "business"
              ? "bg-white text-[#1A1A1A] shadow-sm"
              : "text-[#777] hover:text-[#1A1A1A]"
          }`}
        >
          <Store className="w-3.5 h-3.5" /> Business Owner
        </button>
        <button
          type="button"
          onClick={() => setAccountType("consumer")}
          className={`py-2.5 px-4 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 ${
            accountType === "consumer"
              ? "bg-white text-[#1A1A1A] shadow-sm"
              : "text-[#777] hover:text-[#1A1A1A]"
          }`}
        >
          <UserCheck className="w-3.5 h-3.5" /> Customer
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Full Name */}
        <div>
          <label className="block text-xs font-bold text-[#1A1A1A] uppercase tracking-wider mb-2">
            Full Name
          </label>
          <div className="relative">
            <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#888]" />
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Aisha Sharma"
              className="w-full bg-white border border-[#DDD8CF] focus:border-[#1A1A1A] rounded-2xl py-3.5 pl-11 pr-4 text-sm font-medium text-[#1A1A1A] placeholder:text-[#AAA] outline-none transition-colors"
              required
            />
          </div>
        </div>

        {/* Email */}
        <div>
          <label className="block text-xs font-bold text-[#1A1A1A] uppercase tracking-wider mb-2">
            Email address
          </label>
          <div className="relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#888]" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@business.com"
              className="w-full bg-white border border-[#DDD8CF] focus:border-[#1A1A1A] rounded-2xl py-3.5 pl-11 pr-4 text-sm font-medium text-[#1A1A1A] placeholder:text-[#AAA] outline-none transition-colors"
              required
            />
          </div>
        </div>

        {/* Password */}
        <div>
          <label className="block text-xs font-bold text-[#1A1A1A] uppercase tracking-wider mb-2">
            Password
          </label>
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#888]" />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-white border border-[#DDD8CF] focus:border-[#1A1A1A] rounded-2xl py-3.5 pl-11 pr-4 text-sm font-medium text-[#1A1A1A] placeholder:text-[#AAA] outline-none transition-colors"
              required
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading || googleLoading}
          className="w-full bg-[#1A1A1A] text-white py-4 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 hover:bg-[#333] transition disabled:opacity-60 shadow-md"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>
              Continue <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>

      <div className="relative flex items-center justify-center my-6">
        <div className="border-t border-[#DDD8CF] w-full" />
        <span className="bg-[#F7F6F3] px-3 text-xs text-[#888] font-semibold uppercase tracking-wider absolute">
          Or sign up with
        </span>
      </div>

      <button
        type="button"
        onClick={handleGoogleSignup}
        disabled={loading || googleLoading}
        className="w-full bg-white border border-[#DDD8CF] text-[#1A1A1A] py-3.5 rounded-2xl text-sm font-bold flex items-center justify-center gap-3 hover:bg-[#EEEAE4] transition disabled:opacity-60 shadow-sm"
      >
        {googleLoading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <>
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            Google
          </>
        )}
      </button>
    </div>
  );
}
