import { create } from "zustand";
import { useHistoryStore } from "./historyStore";

export const useBuilderStore = create((set, get) => ({
  // State
  layout: [
    {
      id: "hero-1",
      type: "HeroSection",
      props: {
        title: "Welcome to Our Store",
        subtitle: "Discover unique handcrafted products locally",
        ctaText: "Explore Collection",
        ctaLink: "#products",
      },
      styles: {
        padding: "64px 24px",
        backgroundColor: "#1A1A1A",
        textColor: "#FFFFFF",
        textAlign: "center",
      },
      children: [],
    },
  ],
  selectedComponentId: null,
  hoveredComponentId: null,
  activeDevice: "desktop", // 'desktop' | 'tablet' | 'mobile'
  theme: {
    primaryColor: "#1A1A1A",
    secondaryColor: "#F7F6F3",
    fontFamily: "var(--font-sans)",
  },

  // Initialize from API / Firestore
  initializeFromAPI: ({ siteId, pageId, theme, page }) => {
    set((state) => ({
      layout: page?.layout || state.layout || [],
      theme: theme || state.theme,
    }));
  },
  _recordHistory: () => {
    const currentLayout = get().layout;
    useHistoryStore.getState().pushState(currentLayout);
  },

  // Actions
  setLayout: (newLayout) => {
    set({ layout: newLayout });
    get()._recordHistory();
  },

  setSelectedComponentId: (id) => set({ selectedComponentId: id }),
  setHoveredComponentId: (id) => set({ hoveredComponentId: id }),
  setActiveDevice: (device) => set({ activeDevice: device }),
  setTheme: (newTheme) => set((state) => ({ theme: { ...state.theme, ...newTheme } })),

  addComponent: (componentType, targetIndex = null, parentId = null) => {
    const newComponent = {
      id: `comp-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      type: componentType,
      props: {
        title: "New Block",
        content: "Add your text content here...",
      },
      styles: {
        padding: "32px 16px",
        backgroundColor: "transparent",
      },
      children: [],
    };

    set((state) => {
      let updatedLayout = [...state.layout];
      if (targetIndex !== null && targetIndex >= 0) {
        updatedLayout.splice(targetIndex, 0, newComponent);
      } else {
        updatedLayout.push(newComponent);
      }
      return {
        layout: updatedLayout,
        selectedComponentId: newComponent.id,
      };
    });

    get()._recordHistory();
  },

  removeComponent: (id) => {
    set((state) => {
      const removeRecursive = (items) =>
        items
          .filter((item) => item.id !== id)
          .map((item) => ({
            ...item,
            children: item.children ? removeRecursive(item.children) : [],
          }));

      const updatedLayout = removeRecursive(state.layout);
      return {
        layout: updatedLayout,
        selectedComponentId:
          state.selectedComponentId === id ? null : state.selectedComponentId,
      };
    });

    get()._recordHistory();
  },

  updateComponentProps: (id, newProps) => {
    set((state) => {
      const updateRecursive = (items) =>
        items.map((item) => {
          if (item.id === id) {
            return { ...item, props: { ...item.props, ...newProps } };
          }
          if (item.children && item.children.length > 0) {
            return { ...item, children: updateRecursive(item.children) };
          }
          return item;
        });

      return { layout: updateRecursive(state.layout) };
    });

    get()._recordHistory();
  },

  updateComponentStyles: (id, newStyles) => {
    set((state) => {
      const updateRecursive = (items) =>
        items.map((item) => {
          if (item.id === id) {
            return { ...item, styles: { ...item.styles, ...newStyles } };
          }
          if (item.children && item.children.length > 0) {
            return { ...item, children: updateRecursive(item.children) };
          }
          return item;
        });

      return { layout: updateRecursive(state.layout) };
    });

    get()._recordHistory();
  },

  moveComponent: (id, direction) => {
    set((state) => {
      const index = state.layout.findIndex((item) => item.id === id);
      if (index === -1) return state;

      const targetIndex = direction === "up" ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= state.layout.length) return state;

      const updatedLayout = [...state.layout];
      const [movedItem] = updatedLayout.splice(index, 1);
      updatedLayout.splice(targetIndex, 0, movedItem);

      return { layout: updatedLayout };
    });

    get()._recordHistory();
  },

  reorderComponents: (startIndex, endIndex) => {
    set((state) => {
      const result = Array.from(state.layout);
      const [removed] = result.splice(startIndex, 1);
      result.splice(endIndex, 0, removed);
      return { layout: result };
    });

    get()._recordHistory();
  },
}));
