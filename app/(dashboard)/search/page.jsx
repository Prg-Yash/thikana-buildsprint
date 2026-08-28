"use client";

import React, { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Search } from "lucide-react";

function SearchContent() {
  const searchParams = useSearchParams();
  const query = searchParams.get("q") || "";

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3 bg-white dark:bg-[#1A1A1A] p-6 rounded-3xl border border-[#E5E0D8] dark:border-white/10 shadow-sm">
        <Search className="w-6 h-6 text-gray-500" />
        <div>
          <h1 className="text-xl font-extrabold text-[#1A1A1A] dark:text-white" style={{ fontFamily: "var(--font-heading)" }}>
            Search Results
          </h1>
          <p className="text-xs text-gray-500">
            {query ? `Showing results for "${query}"` : "Enter a search term above"}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div>Loading search...</div>}>
      <SearchContent />
    </Suspense>
  );
}
