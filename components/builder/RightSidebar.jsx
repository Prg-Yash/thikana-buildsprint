"use client";

import React, { useState } from "react";
import { useBuilderStore } from "@/lib/stores/builderStore";
import { defaultComponentProps } from "@/components/registry";
import { Sliders, Paintbrush, AlignLeft, AlignCenter, AlignRight, Layout, Trash2 } from "lucide-react";

export default function RightSidebar() {
  const [activeTab, setActiveTab] = useState("content"); // 'content' | 'style'
  const {
    layout,
    selectedComponentId,
    updateComponentProps,
    updateComponentStyles,
    removeComponent,
  } = useBuilderStore();

  const selectedBlock = layout.find((item) => item.id === selectedComponentId);

  if (!selectedBlock) {
    return (
      <div className="w-80 bg-white dark:bg-[#1A1A1A] border-l border-[#E5E0D8] dark:border-white/10 p-6 text-center flex flex-col items-center justify-center h-full shrink-0 select-none space-y-3">
        <div className="w-10 h-10 rounded-2xl bg-[#F7F6F3] dark:bg-[#252525] flex items-center justify-center text-gray-400">
          <Sliders className="w-5 h-5" />
        </div>
        <h3 className="font-extrabold text-sm text-[#1A1A1A] dark:text-white">No Block Selected</h3>
        <p className="text-xs text-gray-400 max-w-xs">
          Click any component on the canvas to inspect and customize its content and styles.
        </p>
      </div>
    );
  }

  const props = selectedBlock.props || {};
  const styles = selectedBlock.styles || {};
  const blockMeta = defaultComponentProps[selectedBlock.type] || { name: selectedBlock.type };

  return (
    <div className="w-80 bg-white dark:bg-[#1A1A1A] border-l border-[#E5E0D8] dark:border-white/10 flex flex-col h-full shrink-0 select-none">
      {/* Header */}
      <div className="p-4 border-b border-[#E5E0D8] dark:border-white/10 flex items-center justify-between bg-[#F7F6F3] dark:bg-[#141414]">
        <div>
          <span className="text-[10px] font-extrabold uppercase text-gray-400">Inspector</span>
          <h2 className="text-xs font-extrabold text-[#1A1A1A] dark:text-white">{blockMeta.name}</h2>
        </div>
        <button
          onClick={() => removeComponent(selectedBlock.id)}
          className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition"
          title="Delete Block"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center border-b border-[#E5E0D8] dark:border-white/10 p-1.5 bg-[#F7F6F3] dark:bg-[#141414]">
        <button
          onClick={() => setActiveTab("content")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold transition ${
            activeTab === "content"
              ? "bg-white text-[#1A1A1A] dark:bg-[#252525] dark:text-white shadow-xs"
              : "text-gray-500 hover:text-[#1A1A1A]"
          }`}
        >
          <Sliders className="w-3.5 h-3.5" /> Content
        </button>
        <button
          onClick={() => setActiveTab("style")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold transition ${
            activeTab === "style"
              ? "bg-white text-[#1A1A1A] dark:bg-[#252525] dark:text-white shadow-xs"
              : "text-gray-500 hover:text-[#1A1A1A]"
          }`}
        >
          <Paintbrush className="w-3.5 h-3.5" /> Style
        </button>
      </div>

      {/* Content Form Fields */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {activeTab === "content" && (
          <div className="space-y-4">
            {Object.keys(props).map((key) => {
              const value = props[key];

              // Skip arrays for simple inputs (array controls can be handled if needed)
              if (Array.isArray(value)) return null;

              return (
                <div key={key} className="space-y-1.5">
                  <label className="block text-[11px] font-extrabold text-gray-500 uppercase tracking-wider">
                    {key.replace(/([A-Z])/g, " $1")}
                  </label>

                  {typeof value === "boolean" ? (
                    <button
                      type="button"
                      onClick={() =>
                        updateComponentProps(selectedBlock.id, { [key]: !value })
                      }
                      className={`w-full py-2.5 px-3 rounded-xl text-xs font-bold border transition ${
                        value
                          ? "bg-[#1A1A1A] text-white border-[#1A1A1A]"
                          : "bg-[#F7F6F3] text-gray-700 border-gray-200"
                      }`}
                    >
                      {value ? "Enabled" : "Disabled"}
                    </button>
                  ) : key.toLowerCase().includes("content") || key.toLowerCase().includes("subtitle") || key.toLowerCase().includes("tagline") ? (
                    <textarea
                      value={value || ""}
                      onChange={(e) =>
                        updateComponentProps(selectedBlock.id, { [key]: e.target.value })
                      }
                      rows={3}
                      className="w-full bg-[#F7F6F3] dark:bg-[#252525] border border-gray-200 dark:border-white/10 rounded-xl p-3 text-xs font-medium text-[#1A1A1A] dark:text-white outline-none focus:border-[#1A1A1A] transition"
                    />
                  ) : (
                    <input
                      type="text"
                      value={value || ""}
                      onChange={(e) =>
                        updateComponentProps(selectedBlock.id, { [key]: e.target.value })
                      }
                      className="w-full bg-[#F7F6F3] dark:bg-[#252525] border border-gray-200 dark:border-white/10 rounded-xl p-3 text-xs font-medium text-[#1A1A1A] dark:text-white outline-none focus:border-[#1A1A1A] transition"
                    />
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Style Form Fields */}
        {activeTab === "style" && (
          <div className="space-y-4">
            {/* Background Color */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-extrabold text-gray-500 uppercase tracking-wider">
                Background Color
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={styles.backgroundColor || "#FFFFFF"}
                  onChange={(e) =>
                    updateComponentStyles(selectedBlock.id, { backgroundColor: e.target.value })
                  }
                  className="w-10 h-10 rounded-xl border border-gray-200 cursor-pointer p-0.5"
                />
                <input
                  type="text"
                  value={styles.backgroundColor || "#FFFFFF"}
                  onChange={(e) =>
                    updateComponentStyles(selectedBlock.id, { backgroundColor: e.target.value })
                  }
                  className="flex-1 bg-[#F7F6F3] dark:bg-[#252525] border border-gray-200 dark:border-white/10 rounded-xl p-2.5 text-xs font-mono text-[#1A1A1A] dark:text-white uppercase outline-none"
                />
              </div>
            </div>

            {/* Text Color */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-extrabold text-gray-500 uppercase tracking-wider">
                Text Color
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={styles.textColor || "#1A1A1A"}
                  onChange={(e) =>
                    updateComponentStyles(selectedBlock.id, { textColor: e.target.value })
                  }
                  className="w-10 h-10 rounded-xl border border-gray-200 cursor-pointer p-0.5"
                />
                <input
                  type="text"
                  value={styles.textColor || "#1A1A1A"}
                  onChange={(e) =>
                    updateComponentStyles(selectedBlock.id, { textColor: e.target.value })
                  }
                  className="flex-1 bg-[#F7F6F3] dark:bg-[#252525] border border-gray-200 dark:border-white/10 rounded-xl p-2.5 text-xs font-mono text-[#1A1A1A] dark:text-white uppercase outline-none"
                />
              </div>
            </div>

            {/* Padding */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-extrabold text-gray-500 uppercase tracking-wider">
                Padding
              </label>
              <input
                type="text"
                value={styles.padding || "48px 24px"}
                placeholder="48px 24px"
                onChange={(e) =>
                  updateComponentStyles(selectedBlock.id, { padding: e.target.value })
                }
                className="w-full bg-[#F7F6F3] dark:bg-[#252525] border border-gray-200 dark:border-white/10 rounded-xl p-3 text-xs font-medium text-[#1A1A1A] dark:text-white outline-none"
              />
            </div>

            {/* Text Alignment */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-extrabold text-gray-500 uppercase tracking-wider">
                Text Align
              </label>
              <div className="grid grid-cols-3 gap-2 bg-[#F7F6F3] dark:bg-[#252525] p-1.5 rounded-2xl border border-gray-200 dark:border-white/10">
                <button
                  onClick={() => updateComponentStyles(selectedBlock.id, { textAlign: "left" })}
                  className={`py-2 rounded-xl flex items-center justify-center text-xs font-bold transition ${
                    styles.textAlign === "left"
                      ? "bg-[#1A1A1A] text-white"
                      : "text-gray-600 hover:text-black"
                  }`}
                >
                  <AlignLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => updateComponentStyles(selectedBlock.id, { textAlign: "center" })}
                  className={`py-2 rounded-xl flex items-center justify-center text-xs font-bold transition ${
                    styles.textAlign === "center" || !styles.textAlign
                      ? "bg-[#1A1A1A] text-white"
                      : "text-gray-600 hover:text-black"
                  }`}
                >
                  <AlignCenter className="w-4 h-4" />
                </button>
                <button
                  onClick={() => updateComponentStyles(selectedBlock.id, { textAlign: "right" })}
                  className={`py-2 rounded-xl flex items-center justify-center text-xs font-bold transition ${
                    styles.textAlign === "right"
                      ? "bg-[#1A1A1A] text-white"
                      : "text-gray-600 hover:text-black"
                  }`}
                >
                  <AlignRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
