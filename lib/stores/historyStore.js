import { create } from "zustand";

export const useHistoryStore = create((set, get) => ({
  past: [],
  future: [],

  initialize: ({ site, theme, pages }) => {
    set({ past: [], future: [] });
  },

  pushState: (newLayout) => {
    const { past } = get();
    // Keep last 30 history states
    const updatedPast = [...past, JSON.stringify(newLayout)].slice(-30);
    set({ past: updatedPast, future: [] });
  },

  undo: (currentLayout, applyLayout) => {
    const { past, future } = get();
    if (past.length === 0) return;

    const previousLayoutState = past[past.length - 1];
    const newPast = past.slice(0, past.length - 1);
    const newFuture = [JSON.stringify(currentLayout), ...future];

    set({ past: newPast, future: newFuture });
    applyLayout(JSON.parse(previousLayoutState));
  },

  redo: (currentLayout, applyLayout) => {
    const { past, future } = get();
    if (future.length === 0) return;

    const nextLayoutState = future[0];
    const newFuture = future.slice(1);
    const newPast = [...past, JSON.stringify(currentLayout)];

    set({ past: newPast, future: newFuture });
    applyLayout(JSON.parse(nextLayoutState));
  },

  canUndo: () => get().past.length > 0,
  canRedo: () => get().future.length > 0,
}));
