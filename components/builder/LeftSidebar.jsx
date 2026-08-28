"use client";

import React, { useState } from "react";
import { useBuilderStore } from "@/lib/stores/builderStore";
import { defaultComponentProps } from "@/components/registry";
import { templates } from "@/lib/templates";
import {
  Blocks,
  Layers,
  Palette,
  Plus,
  Trash2,
  Move,
  GripVertical,
  Type,
  LayoutTemplate,
  ShoppingBag,
  MapPin,
  Sparkles,
  Layout,
  Check,
} from "lucide-react";

const CATEGORIES = [
  {
    name: "Elementor Layout & Containers",
    icon: Layout,
    blocks: [
      { type: "ContainerBlock", label: "Flex / Grid Container", icon: Layout },
    ],
  },
  {
    name: "Atomic Widgets",
    icon: Type,
    blocks: [
      { type: "HeadingBlock", label: "Heading Widget", icon: Type },
      { type: "TextBlock", label: "Text Paragraph", icon: Type },
      { type: "IconBoxBlock", label: "Icon Box Widget", icon: Sparkles },
    ],
  },
  {
    name: "Hero & Headers",
    icon: LayoutTemplate,
    blocks: [
      { type: "NavbarSection", label: "Header Nav", icon: LayoutTemplate },
      { type: "HeroSection", label: "Hero Banner", icon: Sparkles },
    ],
  },
  {
    name: "Content & Features",
    icon: Blocks,
    blocks: [
      { type: "FeaturesSection", label: "Features Grid", icon: Blocks },
      { type: "CTASection", label: "Call to Action", icon: Type },
    ],
  },
  {
    name: "Location & Contact",
    icon: MapPin,
    blocks: [{ type: "MapSection", label: "Store Map & Hours", icon: MapPin }],
  },
  {
    name: "E-Commerce",
    icon: ShoppingBag,
    blocks: [{ type: "PricingSection", label: "Product Packages", icon: ShoppingBag }],
  },
  {
    name: "Footer",
    icon: LayoutTemplate,
    blocks: [{ type: "FooterSection", label: "Footer Bar", icon: LayoutTemplate }],
  },
];

const PRESET_PALETTES = [
  { name: "Classic Noir", primaryColor: "#1A1A1A", secondaryColor: "#F7F6F3", accentColor: "#C8B99A" },
  { name: "Earthy Warmth", primaryColor: "#2D241E", secondaryColor: "#F5EFEB", accentColor: "#D4A373" },
  { name: "Emerald Luxe", primaryColor: "#0F2C23", secondaryColor: "#F0F7F4", accentColor: "#52B788" },
  { name: "Ocean Breeze", primaryColor: "#111827", secondaryColor: "#F3F4F6", accentColor: "#3B82F6" },
];

export default function LeftSidebar() {
  const [activeTab, setActiveTab] = useState("components"); // 'components' | 'templates' | 'layers' | 'theme'
  const {
    layout,
    selectedComponentId,
    theme,
    addComponent,
    removeComponent,
    reorderComponents,
    setSelectedComponentId,
    setTheme,
  } = useBuilderStore();

  const handleAddBlock = (blockType) => {
    addComponent(blockType);
  };

  return (
    <div className="w-72 bg-white dark:bg-[#1A1A1A] border-r border-[#E5E0D8] dark:border-white/10 flex flex-col h-full shrink-0 select-none">
      {/* Sidebar Navigation Tabs */}
      <div className="flex items-center border-b border-[#E5E0D8] dark:border-white/10 p-1 bg-[#F7F6F3] dark:bg-[#141414]">
        <button
          onClick={() => setActiveTab("components")}
          className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-[11px] font-bold transition ${
            activeTab === "components"
              ? "bg-white text-[#1A1A1A] dark:bg-[#252525] dark:text-white shadow-xs"
              : "text-gray-500 hover:text-[#1A1A1A]"
          }`}
        >
          <Blocks className="w-3.5 h-3.5" /> Blocks
        </button>
        <button
          onClick={() => setActiveTab("templates")}
          className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-[11px] font-bold transition ${
            activeTab === "templates"
              ? "bg-white text-[#1A1A1A] dark:bg-[#252525] dark:text-white shadow-xs"
              : "text-gray-500 hover:text-[#1A1A1A]"
          }`}
        >
          <Layout className="w-3.5 h-3.5" /> Templates
        </button>
        <button
          onClick={() => setActiveTab("layers")}
          className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-[11px] font-bold transition ${
            activeTab === "layers"
              ? "bg-white text-[#1A1A1A] dark:bg-[#252525] dark:text-white shadow-xs"
              : "text-gray-500 hover:text-[#1A1A1A]"
          }`}
        >
          <Layers className="w-3.5 h-3.5" /> Layers
        </button>
        <button
          onClick={() => setActiveTab("theme")}
          className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-[11px] font-bold transition ${
            activeTab === "theme"
              ? "bg-white text-[#1A1A1A] dark:bg-[#252525] dark:text-white shadow-xs"
              : "text-gray-500 hover:text-[#1A1A1A]"
          }`}
        >
          <Palette className="w-3.5 h-3.5" /> Theme
        </button>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === "components" && (
          <div className="space-y-6">
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
              Add Blocks to Canvas
            </p>

            {CATEGORIES.map((cat) => (
              <div key={cat.name} className="space-y-2">
                <span className="text-xs font-extrabold text-[#1A1A1A] dark:text-white flex items-center gap-1.5">
                  <cat.icon className="w-3.5 h-3.5 text-gray-400" /> {cat.name}
                </span>
                <div className="grid grid-cols-1 gap-2">
                  {cat.blocks.map((b) => (
                    <button
                      key={b.type}
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData("application/thikana-block-type", b.type);
                      }}
                      onClick={() => handleAddBlock(b.type)}
                      className="flex items-center justify-between p-3 rounded-2xl border border-gray-200 dark:border-white/10 hover:border-[#1A1A1A] dark:hover:border-white bg-[#F7F6F3] dark:bg-[#222222] hover:bg-white dark:hover:bg-[#2A2A2A] transition group text-left cursor-grab active:cursor-grabbing"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="p-1.5 rounded-lg bg-white dark:bg-[#1A1A1A] border border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-200">
                          <b.icon className="w-4 h-4" />
                        </div>
                        <span className="text-xs font-bold text-[#1A1A1A] dark:text-white">
                          {b.label}
                        </span>
                      </div>
                      <Plus className="w-4 h-4 text-gray-400 group-hover:text-[#1A1A1A] dark:group-hover:text-white transition" />
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === "templates" && (
          <div className="space-y-4">
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
              Pre-built Storefront Templates
            </p>
            <div className="space-y-3">
              {templates.map((tpl) => (
                <div
                  key={tpl.id}
                  className="p-4 rounded-2xl border border-gray-200 dark:border-white/10 bg-[#F7F6F3] dark:bg-[#222222] hover:border-[#1A1A1A] transition space-y-3"
                >
                  <div>
                    <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-white dark:bg-[#1A1A1A] text-gray-600 dark:text-gray-300 border border-gray-200">
                      {tpl.category}
                    </span>
                    <h3 className="font-extrabold text-sm text-[#1A1A1A] dark:text-white mt-1.5">
                      {tpl.name}
                    </h3>
                    <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                      {tpl.description}
                    </p>
                  </div>

                  <button
                    onClick={() => {
                      useBuilderStore.getState().setLayout(tpl.layout);
                      useBuilderStore.getState().setTheme(tpl.theme);
                    }}
                    className="w-full bg-[#1A1A1A] text-white dark:bg-white dark:text-[#1A1A1A] py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-xs hover:opacity-90 cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5" /> Apply Template
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "layers" && (
          <div className="space-y-4">
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
              Canvas Structure ({layout.length})
            </p>

            {layout.length === 0 ? (
              <div className="text-center py-8 text-xs text-gray-400 font-medium">
                No blocks added yet.
              </div>
            ) : (
              <div className="space-y-2">
                {layout.map((item, idx) => {
                  const isSelected = selectedComponentId === item.id;
                  const defaultInfo = defaultComponentProps[item.type] || {};

                  return (
                    <div
                      key={item.id}
                      onClick={() => setSelectedComponentId(item.id)}
                      className={`flex items-center justify-between p-3 rounded-2xl border transition cursor-pointer ${
                        isSelected
                          ? "bg-[#1A1A1A] text-white border-[#1A1A1A] shadow-xs"
                          : "bg-[#F7F6F3] dark:bg-[#222222] border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-200 hover:border-gray-400"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <GripVertical className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                        <span className="text-xs font-bold truncate">
                          {defaultInfo.name || item.type}
                        </span>
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeComponent(item.id);
                        }}
                        className={`p-1.5 rounded-lg transition ${
                          isSelected
                            ? "hover:bg-red-500/80 text-red-300"
                            : "hover:bg-red-50 dark:hover:bg-red-950/20 text-red-500"
                        }`}
                        title="Delete Layer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === "theme" && (
          <div className="space-y-6">
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
              Global Color Palette
            </p>

            <div className="space-y-3">
              <span className="text-xs font-extrabold text-[#1A1A1A] dark:text-white">
                Preset Palettes
              </span>
              <div className="grid grid-cols-1 gap-2">
                {PRESET_PALETTES.map((pal) => (
                  <button
                    key={pal.name}
                    onClick={() => setTheme(pal)}
                    className="flex items-center justify-between p-3 rounded-2xl border border-gray-200 dark:border-white/10 bg-[#F7F6F3] dark:bg-[#222222] hover:bg-white transition text-left"
                  >
                    <span className="text-xs font-bold text-[#1A1A1A] dark:text-white">
                      {pal.name}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <div
                        className="w-4 h-4 rounded-full border border-gray-300"
                        style={{ backgroundColor: pal.primaryColor }}
                      />
                      <div
                        className="w-4 h-4 rounded-full border border-gray-300"
                        style={{ backgroundColor: pal.secondaryColor }}
                      />
                      <div
                        className="w-4 h-4 rounded-full border border-gray-300"
                        style={{ backgroundColor: pal.accentColor }}
                      />
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3 pt-4 border-t border-gray-200 dark:border-white/10">
              <span className="text-xs font-extrabold text-[#1A1A1A] dark:text-white">
                Custom Primary Color
              </span>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={theme.primaryColor || "#1A1A1A"}
                  onChange={(e) => setTheme({ primaryColor: e.target.value })}
                  className="w-10 h-10 rounded-xl border border-gray-200 cursor-pointer p-0.5"
                />
                <span className="text-xs font-mono text-gray-600 dark:text-gray-300 uppercase">
                  {theme.primaryColor || "#1A1A1A"}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
