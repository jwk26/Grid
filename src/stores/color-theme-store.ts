"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  COLOR_THEME_PERSISTENCE_KEY,
  DEFAULT_COLOR_THEME,
  validateColorTheme,
  type ColorThemeId,
} from "@/lib/color-themes";

interface ColorThemeState {
  colorTheme: ColorThemeId;
  setColorTheme: (theme: ColorThemeId) => void;
}

export const useColorThemeStore = create<ColorThemeState>()(
  persist(
    (set) => ({
      colorTheme: DEFAULT_COLOR_THEME,
      setColorTheme: (theme) => set({ colorTheme: validateColorTheme(theme) }),
    }),
    {
      name: COLOR_THEME_PERSISTENCE_KEY,
      partialize: (state) => ({ colorTheme: state.colorTheme }),
      // Store just the theme id string so the no-flash init script can read it directly.
      // Each accessor guards against SSR / Node.js environments where localStorage
      // may be undefined or restricted.
      storage: {
        getItem(name) {
          try {
            if (typeof localStorage === "undefined") return null;
            const raw = localStorage.getItem(name);
            if (!raw) return null;
            return { state: { colorTheme: validateColorTheme(raw) } };
          } catch {
            return null;
          }
        },
        setItem(name, value) {
          try {
            if (typeof localStorage === "undefined") return;
            localStorage.setItem(name, value.state.colorTheme);
          } catch {
            // no-op in SSR or restricted environments
          }
        },
        removeItem(name) {
          try {
            if (typeof localStorage === "undefined") return;
            localStorage.removeItem(name);
          } catch {
            // no-op
          }
        },
      },
    }
  )
);
