import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { COLOR_THEMES, COLOR_THEME_PERSISTENCE_KEY } from "@/lib/color-themes";
import { useColorThemeStore } from "./color-theme-store";

// Node.js 26 defines localStorage as undefined, preventing jsdom from overriding it.
// We install a mock via beforeAll so the persist subscriber (wired at store creation)
// can write to localStorage for subsequent setColorTheme calls.
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string): string | null => store[key] ?? null,
    setItem: (key: string, value: string): void => { store[key] = value; },
    removeItem: (key: string): void => { delete store[key]; },
    clear: (): void => { store = {}; },
    get length() { return Object.keys(store).length; },
    key: (index: number): string | null => Object.keys(store)[index] ?? null,
  };
})();

beforeAll(() => {
  vi.stubGlobal("localStorage", localStorageMock);
});

afterAll(() => {
  vi.unstubAllGlobals();
});

beforeEach(() => {
  localStorageMock.clear();
  useColorThemeStore.setState({ colorTheme: "griddo" });
});

afterEach(() => {
  localStorageMock.clear();
});

describe("color-theme-store", () => {
  describe("useColorThemeStore", () => {
    it("has griddo as the default colorTheme", () => {
      expect(useColorThemeStore.getState().colorTheme).toBe("griddo");
    });

    it("updates colorTheme when setColorTheme is called with a valid theme", () => {
      useColorThemeStore.getState().setColorTheme("retro-mac");
      expect(useColorThemeStore.getState().colorTheme).toBe("retro-mac");
    });

    it("accepts every allowed theme id without error", () => {
      for (const theme of COLOR_THEMES) {
        useColorThemeStore.getState().setColorTheme(theme);
        expect(useColorThemeStore.getState().colorTheme).toBe(theme);
      }
    });

    it("falls back to griddo in store state when an invalid value is set", () => {
      useColorThemeStore.getState().setColorTheme("not-a-theme" as never);
      expect(useColorThemeStore.getState().colorTheme).toBe("griddo");
    });

    it("persists the selected theme id as a plain string at the correct key", () => {
      useColorThemeStore.getState().setColorTheme("neumorphism");
      expect(localStorage.getItem(COLOR_THEME_PERSISTENCE_KEY)).toBe("neumorphism");
    });

    it("persists griddo to localStorage when an invalid value is set", () => {
      useColorThemeStore.getState().setColorTheme("bad-theme" as never);
      expect(localStorage.getItem(COLOR_THEME_PERSISTENCE_KEY)).toBe("griddo");
    });

    it("updates the persisted value on each theme change", () => {
      useColorThemeStore.getState().setColorTheme("claymorphism");
      expect(localStorage.getItem(COLOR_THEME_PERSISTENCE_KEY)).toBe("claymorphism");

      useColorThemeStore.getState().setColorTheme("retro-mac");
      expect(localStorage.getItem(COLOR_THEME_PERSISTENCE_KEY)).toBe("retro-mac");
    });

    it("hydrates from a valid persisted theme id (simulates page refresh)", async () => {
      localStorage.setItem(COLOR_THEME_PERSISTENCE_KEY, "retro-mac");
      await useColorThemeStore.persist.rehydrate();
      expect(useColorThemeStore.getState().colorTheme).toBe("retro-mac");
    });

    it("falls back to griddo when a removed theme id is persisted", async () => {
      localStorage.setItem(COLOR_THEME_PERSISTENCE_KEY, "terminal");
      await useColorThemeStore.persist.rehydrate();
      expect(useColorThemeStore.getState().colorTheme).toBe("griddo");
    });

    it("falls back to griddo when localStorage contains an invalid value at hydration", async () => {
      localStorage.setItem(COLOR_THEME_PERSISTENCE_KEY, "not-a-theme");
      await useColorThemeStore.persist.rehydrate();
      expect(useColorThemeStore.getState().colorTheme).toBe("griddo");
    });
  });
});
