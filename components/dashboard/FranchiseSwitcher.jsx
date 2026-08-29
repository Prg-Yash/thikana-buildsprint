"use client";

import React, { useState, useRef, useEffect } from "react";
import { useBusiness } from "@/context/BusinessContext";
import {
  Building2,
  Store,
  ChevronDown,
  Check,
  RotateCcw,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";

export function FranchiseSwitcher() {
  const {
    business,
    activeBusinessData,
    isSwitchedView,
    franchises,
    switchFranchise,
    returnToHQ,
  } = useBusiness();

  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2.5 px-3.5 py-2 rounded-2xl border text-xs font-bold transition-all shadow-xs ${
          isSwitchedView
            ? "bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-200 hover:bg-amber-100"
            : "bg-white dark:bg-[#222] border-[#E5E0D8] dark:border-white/10 text-[#1A1A1A] dark:text-white hover:bg-gray-50 dark:hover:bg-white/5"
        }`}
      >
        <div
          className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${
            isSwitchedView
              ? "bg-amber-500 text-white"
              : "bg-[#1A1A1A] text-white dark:bg-white dark:text-[#1A1A1A]"
          }`}
        >
          {isSwitchedView ? (
            <Store className="w-3.5 h-3.5" />
          ) : (
            <Building2 className="w-3.5 h-3.5" />
          )}
        </div>

        <div className="flex flex-col text-left max-w-[140px] sm:max-w-[200px]">
          <span className="text-[10px] text-gray-500 dark:text-gray-400 font-semibold leading-none uppercase tracking-wider mb-0.5">
            {isSwitchedView ? "Scoped Franchise View" : "Headquarters Central"}
          </span>
          <span className="truncate font-extrabold text-xs">
            {activeBusinessData?.name || "Select Business Workspace"}
          </span>
        </div>

        <ChevronDown className="w-3.5 h-3.5 opacity-60 ml-1 shrink-0" />
      </button>

      {isOpen && (
        <div className="absolute left-0 mt-2 w-72 sm:w-80 bg-white dark:bg-[#1C1C1C] border border-[#E5E0D8] dark:border-white/10 rounded-2xl shadow-2xl py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
          <div className="px-4 py-2 border-b border-gray-100 dark:border-white/10 flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">
              Select Operational Workspace
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
              Multi-Outlet
            </span>
          </div>

          {/* Headquarters Section */}
          <div className="px-2 py-1.5">
            <button
              onClick={() => {
                returnToHQ();
                setIsOpen(false);
              }}
              className={`w-full flex items-center justify-between p-2.5 rounded-xl transition ${
                !isSwitchedView
                  ? "bg-[#1A1A1A] text-white dark:bg-white dark:text-[#1A1A1A]"
                  : "hover:bg-gray-100 dark:hover:bg-white/5 text-gray-800 dark:text-gray-200"
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                    !isSwitchedView
                      ? "bg-white/20 text-white dark:bg-black/20 dark:text-black"
                      : "bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-300"
                  }`}
                >
                  <Building2 className="w-4 h-4" />
                </div>
                <div className="text-left min-w-0">
                  <p className="text-xs font-bold truncate">
                    {business?.name || "Headquarters Workspace"}
                  </p>
                  <p
                    className={`text-[10px] truncate ${
                      !isSwitchedView
                        ? "opacity-80"
                        : "text-gray-500 dark:text-gray-400"
                    }`}
                  >
                    Full Admin Control & Directory
                  </p>
                </div>
              </div>
              {!isSwitchedView && <Check className="w-4 h-4 shrink-0" />}
            </button>
          </div>

          <div className="px-4 py-1">
            <div className="h-px bg-gray-100 dark:bg-white/10" />
          </div>

          {/* Child Franchises List */}
          <div className="px-2 py-1 max-h-56 overflow-y-auto space-y-1">
            <p className="px-2 text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 my-1">
              Child Franchise Outlets ({franchises.length})
            </p>
            {franchises.map((fr) => {
              const isSelected = isSwitchedView && activeBusinessData?.id === fr.id;
              return (
                <button
                  key={fr.id}
                  onClick={() => {
                    switchFranchise(fr.id);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center justify-between p-2.5 rounded-xl transition ${
                    isSelected
                      ? "bg-amber-500 text-white"
                      : "hover:bg-gray-100 dark:hover:bg-white/5 text-gray-800 dark:text-gray-200"
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                        isSelected
                          ? "bg-white/20 text-white"
                          : "bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300"
                      }`}
                    >
                      <Store className="w-4 h-4" />
                    </div>
                    <div className="text-left min-w-0">
                      <p className="text-xs font-bold truncate">{fr.name}</p>
                      <p
                        className={`text-[10px] truncate ${
                          isSelected ? "opacity-80" : "text-gray-500 dark:text-gray-400"
                        }`}
                      >
                        {fr.city} • Admin: {fr.adminName}
                      </p>
                    </div>
                  </div>
                  {isSelected && <Check className="w-4 h-4 shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export function SwitchedViewBanner() {
  const { isSwitchedView, activeBusinessData, returnToHQ } = useBusiness();

  if (!isSwitchedView) return null;

  return (
    <div className="bg-amber-500 text-amber-950 dark:bg-amber-600 dark:text-white px-4 py-2.5 shadow-md flex items-center justify-between gap-3 text-xs sm:text-sm font-semibold border-b border-amber-600/30">
      <div className="flex items-center gap-2 min-w-0">
        <AlertTriangle className="w-4 h-4 shrink-0 animate-bounce" />
        <span className="truncate">
          <strong>Context Switched View:</strong> You are currently managing scoped data for{" "}
          <span className="underline font-bold">{activeBusinessData?.name}</span> ({activeBusinessData?.city}).
        </span>
      </div>

      <button
        onClick={returnToHQ}
        className="bg-amber-950 text-white hover:bg-black dark:bg-white dark:text-amber-950 dark:hover:bg-amber-100 px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 shadow-sm"
      >
        <RotateCcw className="w-3.5 h-3.5" />
        Return to HQ Workspace
      </button>
    </div>
  );
}
