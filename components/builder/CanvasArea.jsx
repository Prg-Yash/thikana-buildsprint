"use client";

import React from "react";
import { useBuilderStore } from "@/lib/stores/builderStore";
import { componentRegistry, defaultComponentProps } from "@/components/registry";
import {
  ChevronUp,
  ChevronDown,
  Trash2,
  Copy,
  Plus,
  Smartphone,
  Tablet,
  Monitor,
} from "lucide-react";

export default function CanvasArea() {
  const {
    layout,
    selectedComponentId,
    hoveredComponentId,
    activeDevice,
    setSelectedComponentId,
    setHoveredComponentId,
    moveComponent,
    removeComponent,
    addComponent,
  } = useBuilderStore();

  const [dragOverIndex, setDragOverIndex] = React.useState(null);

  // Viewport width mapping
  const deviceWidthMap = {
    desktop: "w-full max-w-full",
    tablet: "w-[768px]",
    mobile: "w-[375px]",
  };

  const handleDropOnCanvas = (e, index = null) => {
    e.preventDefault();
    setDragOverIndex(null);
    const blockType = e.dataTransfer.getData("application/thikana-block-type");
    if (blockType) {
      addComponent(blockType, index);
    }
  };

  const handleDuplicate = (id) => {
    const componentToDup = layout.find((item) => item.id === id);
    if (!componentToDup) return;

    const index = layout.findIndex((item) => item.id === id);
    const duplicated = {
      ...JSON.parse(JSON.stringify(componentToDup)),
      id: `comp-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    };

    useBuilderStore.setState((state) => {
      const newLayout = [...state.layout];
      newLayout.splice(index + 1, 0, duplicated);
      return { layout: newLayout, selectedComponentId: duplicated.id };
    });
    useBuilderStore.getState()._recordHistory();
  };

  return (
    <div className="flex-1 bg-[#EAE7E1] dark:bg-[#121212] p-4 sm:p-8 overflow-y-auto flex flex-col items-center h-full">
      {/* Device Frame Wrapper */}
      <div
        className={`transition-all duration-300 mx-auto shadow-2xl rounded-3xl bg-white dark:bg-[#1A1A1A] border-4 border-[#333333] dark:border-white/20 relative min-h-[600px] flex flex-col ${
          deviceWidthMap[activeDevice] || "w-full"
        }`}
      >
        {/* Device Frame Speaker / Notch indicator for mobile/tablet */}
        {activeDevice !== "desktop" && (
          <div className="w-full bg-[#1A1A1A] py-2 flex items-center justify-center shrink-0">
            <div className="w-16 h-1.5 bg-gray-600 rounded-full" />
          </div>
        )}

        {/* Canvas Body */}
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => handleDropOnCanvas(e, layout.length)}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setSelectedComponentId(null);
            }
          }}
          className="flex-1 p-2 sm:p-4 space-y-2 relative"
        >
          {layout.length === 0 ? (
            /* 5. Empty Canvas Dropzone */
            <div className="h-[500px] border-2 border-dashed border-gray-300 dark:border-white/20 rounded-2xl flex flex-col items-center justify-center p-8 text-center space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-black text-white dark:bg-white dark:text-black flex items-center justify-center">
                <Plus className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-extrabold text-base text-[#1A1A1A] dark:text-white">
                  Your website canvas is empty
                </h3>
                <p className="text-xs text-gray-500 max-w-xs mt-1">
                  Start building by adding your first section or block from the left panel.
                </p>
              </div>
              <button
                onClick={() => addComponent("HeroSection")}
                className="bg-[#1A1A1A] text-white dark:bg-white dark:text-[#1A1A1A] px-5 py-2.5 rounded-xl text-xs font-bold shadow-md hover:opacity-90 transition"
              >
                Add Hero Section
              </button>
            </div>
          ) : (
            /* 2. Dynamic Component Mapping */
            layout.map((block, index) => {
              const ComponentClass = componentRegistry[block.type];
              const isSelected = selectedComponentId === block.id;
              const isHovered = hoveredComponentId === block.id;

              if (!ComponentClass) {
                return (
                  <div key={block.id} className="p-4 bg-red-50 text-red-600 rounded-xl text-xs">
                    Unknown component type: {block.type}
                  </div>
                );
              }

              return (
                <div
                  key={block.id}
                  onMouseEnter={() => setHoveredComponentId(block.id)}
                  onMouseLeave={() => setHoveredComponentId(null)}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragOverIndex(index);
                  }}
                  onDrop={(e) => {
                    e.stopPropagation();
                    handleDropOnCanvas(e, index);
                  }}
                  className={`relative group my-2 transition-all ${
                    dragOverIndex === index ? "border-t-4 border-blue-500 pt-2" : ""
                  }`}
                >
                  {/* 3. Interactive Selection Outline & Controls */}
                  <div
                    className={`relative transition-all ${
                      isSelected
                        ? "ring-2 ring-blue-600 ring-offset-2 rounded-2xl"
                        : isHovered
                        ? "ring-1 ring-blue-400/50 rounded-2xl"
                        : ""
                    }`}
                  >
                    <ComponentClass
                      props={block.props}
                      styles={block.styles}
                      isSelected={isSelected}
                      isEditable={true}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedComponentId(block.id);
                      }}
                    >
                      {block.children &&
                        block.children.map((childBlock) => {
                          const ChildClass = componentRegistry[childBlock.type];
                          if (!ChildClass) return null;
                          return (
                            <ChildClass
                              key={childBlock.id}
                              props={childBlock.props}
                              styles={childBlock.styles}
                              isSelected={selectedComponentId === childBlock.id}
                              isEditable={true}
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedComponentId(childBlock.id);
                              }}
                            />
                          );
                        })}
                    </ComponentClass>

                    {/* Floating Toolbar for Selected Block */}
                    {isSelected && (
                      <div className="absolute -top-11 right-4 z-40 bg-[#1A1A1A] text-white rounded-xl shadow-xl px-2 py-1 flex items-center gap-1 border border-white/20 animate-in fade-in zoom-in-95 duration-150">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            moveComponent(block.id, "up");
                          }}
                          disabled={index === 0}
                          className="p-1.5 hover:bg-white/20 rounded-lg transition disabled:opacity-30"
                          title="Move Up"
                        >
                          <ChevronUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            moveComponent(block.id, "down");
                          }}
                          disabled={index === layout.length - 1}
                          className="p-1.5 hover:bg-white/20 rounded-lg transition disabled:opacity-30"
                          title="Move Down"
                        >
                          <ChevronDown className="w-3.5 h-3.5" />
                        </button>
                        <div className="w-[1px] h-4 bg-white/20 my-auto" />
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDuplicate(block.id);
                          }}
                          className="p-1.5 hover:bg-white/20 rounded-lg transition"
                          title="Duplicate"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            removeComponent(block.id);
                          }}
                          className="p-1.5 hover:bg-red-500/80 rounded-lg text-red-400 transition"
                          title="Delete Block"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
