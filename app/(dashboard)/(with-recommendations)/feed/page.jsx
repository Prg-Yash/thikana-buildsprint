"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { useRecommendations } from "@/hooks/useRecommendations";
import { PostCard } from "@/components/PostCard";
import { PostCardSkeleton } from "@/components/PostCardSkeleton";
import { WhoToFollow } from "@/components/WhoToFollow";
import { sendEmailVerification } from "firebase/auth";
import {
  RefreshCw,
  ArrowUp,
  AlertCircle,
  MapPinOff,
  MailWarning,
  Sparkles,
  PlusSquare,
  CheckCircle2,
  Inbox,
  Navigation,
} from "lucide-react";
import toast from "react-hot-toast";

export default function FeedPage() {
  const { user } = useAuth();
  const {
    posts,
    loading,
    error,
    hasMore,
    locationDenied,
    coords,
    fetchFeed,
    loadMore,
    retryLocation,
  } = useRecommendations(user?.uid, 10);

  const [showBackToTop, setShowBackToTop] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [resendingEmail, setResendingEmail] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setShowBackToTop(window.scrollY > 400);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handlePullToRefresh = async () => {
    setRefreshing(true);
    await fetchFeed(true);
    setRefreshing(false);
    toast.success("Feed updated!");
  };

  const handleResendEmail = async () => {
    if (!user) return;
    setResendingEmail(true);
    try {
      await sendEmailVerification(user);
      toast.success("Verification email sent! Please check your inbox.");
    } catch (err) {
      console.error("Resend verification error:", err);
      toast.error(err.message || "Failed to send verification email.");
    } finally {
      setResendingEmail(false);
    }
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* 1. Email & Location Info Banners */}
      <div className="space-y-3">
        {user && !user.emailVerified && (
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-900 dark:text-amber-200 flex items-center justify-between gap-3 text-xs sm:text-sm">
            <div className="flex items-center gap-2.5">
              <MailWarning className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
              <span>
                <strong>Verify your email address</strong> to enable post creation and merchant notifications.
              </span>
            </div>
            <button
              onClick={handleResendEmail}
              disabled={resendingEmail}
              className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shrink-0 transition"
            >
              {resendingEmail ? "Sending..." : "Resend Link"}
            </button>
          </div>
        )}

        {locationDenied && (
          <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-900 dark:text-blue-200 flex items-center justify-between gap-3 text-xs sm:text-sm">
            <div className="flex items-center gap-2.5">
              <MapPinOff className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0" />
              <span>
                Location request timed out or disabled. Showing global updates. Enable location for distance ranking.
              </span>
            </div>
            <button
              onClick={retryLocation}
              className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shrink-0 transition"
            >
              Retry Location
            </button>
          </div>
        )}
      </div>

      {/* Header Bar */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1
              className="text-2xl sm:text-3xl font-black text-[#1A1A1A] dark:text-white tracking-tight"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              Hyperlocal Feed
            </h1>
            <span className="p-1 rounded-lg bg-[#C8B99A]/20 text-[#1A1A1A] dark:text-[#C8B99A]">
              <Sparkles className="w-4 h-4" />
            </span>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Real-time offers, product drops, and updates from local merchants near you.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handlePullToRefresh}
            disabled={refreshing}
            className="p-2.5 rounded-2xl border border-[#E5E0D8] dark:border-white/10 bg-white dark:bg-[#1A1A1A] text-gray-700 dark:text-gray-200 hover:bg-[#F4F1EA] dark:hover:bg-white/5 transition flex items-center gap-2 text-xs font-bold"
            title="Refresh Feed"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          <Link
            href="/posts/create"
            className="p-2.5 sm:px-4 sm:py-2.5 rounded-2xl bg-[#1A1A1A] dark:bg-white text-white dark:text-[#1A1A1A] hover:opacity-90 transition flex items-center gap-2 text-xs font-bold shadow-sm"
          >
            <PlusSquare className="w-4 h-4" />
            <span className="hidden sm:inline">New Post</span>
          </Link>
        </div>
      </div>

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left/Center Main Feed Column */}
        <section className="lg:col-span-8 space-y-5">
          {loading ? (
            /* STATE 1: Loading State */
            <div className="space-y-5">
              <PostCardSkeleton />
              <PostCardSkeleton />
            </div>
          ) : error ? (
            /* STATE 3: Error State */
            <div className="p-8 text-center rounded-3xl bg-white dark:bg-[#1A1A1A] border border-red-200 dark:border-red-900/30 space-y-3">
              <AlertCircle className="w-8 h-8 text-red-500 mx-auto" />
              <p className="text-sm font-bold text-red-600 dark:text-red-400">{error}</p>
              <button
                onClick={() => fetchFeed(true)}
                className="px-4 py-2 bg-red-600 text-white rounded-xl text-xs font-bold"
              >
                Try Again
              </button>
            </div>
          ) : posts.length === 0 ? (
            /* STATE 4: Empty State */
            <div className="p-12 text-center rounded-3xl bg-white dark:bg-[#1A1A1A] border border-[#E5E0D8] dark:border-white/10 space-y-4 shadow-sm">
              <Inbox className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto" />
              <div>
                <h2 className="text-base font-black text-[#1A1A1A] dark:text-white" style={{ fontFamily: "var(--font-heading)" }}>
                  No Updates in Your Area Yet
                </h2>
                <p className="text-xs text-gray-500 mt-1 max-w-md mx-auto">
                  Be the first merchant to publish an offer or check back later as nearby shops join Thikana.
                </p>
              </div>
              <Link
                href="/posts/create"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-[#1A1A1A] text-white dark:bg-white dark:text-[#1A1A1A] text-xs font-bold transition"
              >
                <PlusSquare className="w-4 h-4" /> Create First Post
              </Link>
            </div>
          ) : (
            /* STATE 5 & 6: Loaded Posts & Pagination */
            <>
              {posts.map((post) => (
                <PostCard key={post.id} post={post} currentUserId={user?.uid} />
              ))}

              {hasMore && (
                <div className="pt-4 text-center">
                  <button
                    onClick={loadMore}
                    className="px-6 py-3 rounded-2xl border border-[#E5E0D8] dark:border-white/10 bg-white dark:bg-[#1A1A1A] hover:bg-[#F4F1EA] dark:hover:bg-white/5 text-xs font-bold transition text-[#1A1A1A] dark:text-white"
                  >
                    Load More Updates
                  </button>
                </div>
              )}
            </>
          )}
        </section>

        {/* Right Sidebar Column */}
        <aside className="lg:col-span-4 space-y-6 sticky top-20">
          <WhoToFollow currentUserId={user?.uid} userCoords={coords} />

          <div className="p-5 rounded-3xl bg-[#EEEAE4] dark:bg-[#222222] border border-[#E5E0D8] dark:border-white/10 space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-[#1A1A1A] dark:text-white">
              <CheckCircle2 className="w-4 h-4 text-[#4A7C6F]" />
              <span>Thikana Local Guarantee</span>
            </div>
            <p className="text-[11px] text-gray-600 dark:text-gray-300 leading-relaxed">
              Posts on Thikana are ranked based on geographic proximity, followed stores, and real merchant activity.
            </p>
          </div>
        </aside>
      </div>

      {showBackToTop && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-6 right-6 p-3 rounded-2xl bg-[#1A1A1A] text-white dark:bg-white dark:text-[#1A1A1A] shadow-2xl hover:scale-105 transition-all z-40"
          aria-label="Back to top"
        >
          <ArrowUp className="w-5 h-5" />
        </button>
      )}
    </div>
  );
}
