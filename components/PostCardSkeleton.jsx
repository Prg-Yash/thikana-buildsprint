"use client";

import React from "react";

export function PostCardSkeleton() {
  return (
    <div className="bg-white dark:bg-[#1A1A1A] rounded-3xl border border-[#E5E0D8] dark:border-white/10 p-5 shadow-sm space-y-4 animate-pulse">
      {/* Header Skeleton */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-full bg-gray-200 dark:bg-gray-800" />
          <div className="space-y-1.5">
            <div className="w-32 h-4 bg-gray-200 dark:bg-gray-800 rounded-md" />
            <div className="w-20 h-3 bg-gray-200 dark:bg-gray-800 rounded-md" />
          </div>
        </div>
        <div className="w-16 h-6 bg-gray-200 dark:bg-gray-800 rounded-full" />
      </div>

      {/* Media Skeleton */}
      <div className="w-full h-64 sm:h-80 bg-gray-200 dark:bg-gray-800 rounded-2xl" />

      {/* Caption Skeleton */}
      <div className="space-y-2">
        <div className="w-full h-3.5 bg-gray-200 dark:bg-gray-800 rounded-md" />
        <div className="w-4/5 h-3.5 bg-gray-200 dark:bg-gray-800 rounded-md" />
      </div>

      {/* Actions Skeleton */}
      <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-white/5">
        <div className="flex items-center gap-4">
          <div className="w-12 h-8 bg-gray-200 dark:bg-gray-800 rounded-xl" />
          <div className="w-12 h-8 bg-gray-200 dark:bg-gray-800 rounded-xl" />
          <div className="w-8 h-8 bg-gray-200 dark:bg-gray-800 rounded-xl" />
        </div>
        <div className="w-28 h-9 bg-gray-200 dark:bg-gray-800 rounded-xl" />
      </div>
    </div>
  );
}
