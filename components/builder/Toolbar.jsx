"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useBuilderStore } from "@/lib/stores/builderStore";
import { useHistoryStore } from "@/lib/stores/historyStore";
import { publishWebsiteSchema } from "@/lib/website-operations";
import { useAuth } from "@/hooks/useAuth";
import toast from "react-hot-toast";
import AIPageGenerator from "./AIPageGenerator";
import {
  Monitor,
  Tablet,
  Smartphone,
  Undo,
  Redo,
  Save,
  Eye,
  Globe,
  ArrowLeft,
  CheckCircle2,
  Loader2,
  ExternalLink,
  X,
  Sparkles,
} from "lucide-react";

export default function Toolbar({ businessId, websiteId, saveStatus, websiteTitle = "My Storefront", setWebsiteTitle }) {
  const { user } = useAuth();
  const activeBusinessId = businessId || user?.uid;
  const { activeDevice, setActiveDevice, layout, theme, setLayout } = useBuilderStore();
  const { undo, redo, canUndo, canRedo } = useHistoryStore();

  const [isPublishing, setIsPublishing] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isAIOpen, setIsAIOpen] = useState(false);
  const [publishedUrl, setPublishedUrl] = useState("");

  const handleUndo = () => {
    undo(layout, (newLayout) => {
      setLayout(newLayout);
    });
  };

  const handleRedo = () => {
    redo(layout, (newLayout) => {
      setLayout(newLayout);
    });
  };

  const handlePublish = async () => {
    if (!activeBusinessId || !websiteId) {
      toast.error("Business session missing");
      return;
    }

    setIsPublishing(true);
    try {
      await publishWebsiteSchema(activeBusinessId, websiteId, { layout, theme });
      const publicUrl = `${window.location.origin}/site/${websiteId}`;
      setPublishedUrl(publicUrl);
      toast.success("Website published live successfully!");
    } catch (err) {
      toast.error("Failed to publish website");
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <>
      <header className="h-16 bg-white dark:bg-[#1A1A1A] border-b border-[#E5E0D8] dark:border-white/10 px-4 sm:px-6 flex items-center justify-between gap-4 z-30 shrink-0">
        {/* Left: Back button & Website Title */}
        <div className="flex items-center gap-3">
          <Link
            href="/feed"
            className="p-2 rounded-xl border border-gray-200 dark:border-white/10 text-gray-600 hover:bg-black/5 dark:hover:bg-white/10 transition"
            title="Back to Dashboard"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>

          <div className="flex items-center gap-2">
            <input
              type="text"
              value={websiteTitle}
              onChange={(e) => setWebsiteTitle(e.target.value)}
              className="font-extrabold text-sm sm:text-base text-[#1A1A1A] dark:text-white bg-transparent border-b border-transparent hover:border-gray-300 focus:border-[#1A1A1A] outline-none px-1 py-0.5 transition"
            />
          </div>

          {/* Autosave Status Indicator */}
          <div className="hidden sm:flex items-center gap-1.5 text-xs text-gray-400 font-medium ml-2">
            {saveStatus === "Saving..." ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-500" />
                <span>Saving...</span>
              </>
            ) : saveStatus === "Saved" ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                <span>Saved</span>
              </>
            ) : (
              <span>Unsaved changes</span>
            )}
          </div>
        </div>

        {/* Center: Viewport Switcher */}
        <div className="flex items-center gap-1 bg-[#F7F6F3] dark:bg-[#252525] p-1 rounded-2xl border border-[#DDD8CF] dark:border-white/10">
          <button
            onClick={() => setActiveDevice("desktop")}
            className={`p-2 rounded-xl transition ${
              activeDevice === "desktop"
                ? "bg-[#1A1A1A] text-white dark:bg-white dark:text-[#1A1A1A] shadow-xs"
                : "text-gray-500 hover:text-black"
            }`}
            title="Desktop View"
          >
            <Monitor className="w-4 h-4" />
          </button>
          <button
            onClick={() => setActiveDevice("tablet")}
            className={`p-2 rounded-xl transition ${
              activeDevice === "tablet"
                ? "bg-[#1A1A1A] text-white dark:bg-white dark:text-[#1A1A1A] shadow-xs"
                : "text-gray-500 hover:text-black"
            }`}
            title="Tablet View"
          >
            <Tablet className="w-4 h-4" />
          </button>
          <button
            onClick={() => setActiveDevice("mobile")}
            className={`p-2 rounded-xl transition ${
              activeDevice === "mobile"
                ? "bg-[#1A1A1A] text-white dark:bg-white dark:text-[#1A1A1A] shadow-xs"
                : "text-gray-500 hover:text-black"
            }`}
            title="Mobile View"
          >
            <Smartphone className="w-4 h-4" />
          </button>
        </div>

        {/* Right: History Actions, Preview & Publish */}
        <div className="flex items-center gap-2">
          <div className="hidden md:flex items-center gap-1 mr-2">
            <button
              onClick={handleUndo}
              disabled={!canUndo()}
              className="p-2 rounded-xl border border-gray-200 dark:border-white/10 text-gray-600 hover:bg-black/5 disabled:opacity-30 transition"
              title="Undo"
            >
              <Undo className="w-4 h-4" />
            </button>
            <button
              onClick={handleRedo}
              disabled={!canRedo()}
              className="p-2 rounded-xl border border-gray-200 dark:border-white/10 text-gray-600 hover:bg-black/5 disabled:opacity-30 transition"
              title="Redo"
            >
              <Redo className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={() => setIsAIOpen(true)}
            className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-2 rounded-2xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
          >
            <Sparkles className="w-3.5 h-3.5" /> AI Generate
          </button>

          <button
            onClick={() => setIsPreviewOpen(true)}
            className="bg-[#EEEAE4] dark:bg-[#2A2A2A] hover:bg-[#E2DDD5] text-[#1A1A1A] dark:text-white px-3.5 py-2 rounded-2xl text-xs font-bold transition flex items-center gap-1.5 border border-[#DDD8CF] dark:border-white/10"
          >
            <Eye className="w-3.5 h-3.5" /> Preview
          </button>

          <button
            onClick={handlePublish}
            disabled={isPublishing}
            className="bg-[#1A1A1A] text-white dark:bg-white dark:text-[#1A1A1A] px-4 py-2 rounded-2xl text-xs font-bold transition flex items-center gap-1.5 shadow-md hover:opacity-90 disabled:opacity-50"
          >
            {isPublishing ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <>
                <Globe className="w-3.5 h-3.5" /> Publish
              </>
            )}
          </button>
        </div>
      </header>

      {/* Published URL Banner Modal */}
      {publishedUrl && (
        <div className="bg-emerald-600 text-white px-4 py-2.5 text-xs font-bold flex items-center justify-between gap-3 shadow-md">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>Your website is live at: <strong>{publishedUrl}</strong></span>
          </div>
          <div className="flex items-center gap-2">
            <a
              href={publishedUrl}
              target="_blank"
              rel="noreferrer"
              className="bg-white text-emerald-800 px-3 py-1 rounded-lg hover:bg-emerald-50 transition flex items-center gap-1 text-xs"
            >
              Visit <ExternalLink className="w-3 h-3" />
            </a>
            <button onClick={() => setPublishedUrl("")} className="p-1 hover:text-emerald-200">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
      {/* AI Generator Modal */}
      <AIPageGenerator isOpen={isAIOpen} onClose={() => setIsAIOpen(false)} />
    </>
  );
}
