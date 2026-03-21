import { create } from "zustand";

export type SpecTab = "nl" | "json";

export interface UIStore {
  specTab: SpecTab;
  setSpecTab: (tab: SpecTab) => void;
  collapsedGroups: Record<string, boolean>;
  toggleGroup: (service: string) => void;
}

export const useUIStore = create<UIStore>((set, get) => ({
  specTab: "nl",
  setSpecTab: (tab) => set({ specTab: tab }),
  collapsedGroups: {},
  toggleGroup: (service) => {
    const prev = get().collapsedGroups;
    set({ collapsedGroups: { ...prev, [service]: !prev[service] } });
  },
}));
