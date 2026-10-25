import { afterEach, describe, expect, it } from "vitest";
import {
  COLOR_THEMES,
  COLOR_THEME_PERSISTENCE_KEY,
  buildNoFlashScript,
  isValidColorTheme,
  validateColorTheme,
} from "./color-themes";

describe("color-themes", () => {
  it("lists exactly the four themes", () => {
    expect([...COLOR_THEMES]).toEqual(["griddo", "neumorphism", "claymorphism", "retro-mac"]);
  });

  it("validates ids and falls back to griddo", () => {
    for (const theme of COLOR_THEMES) expect(isValidColorTheme(theme)).toBe(true);
    expect(isValidColorTheme("unknown-theme")).toBe(false);
    expect(isValidColorTheme(null)).toBe(false);
    expect(validateColorTheme("retro-mac")).toBe("retro-mac");
    expect(validateColorTheme("not-a-theme")).toBe("griddo");
    expect(validateColorTheme(42)).toBe("griddo");
  });

  describe("buildNoFlashScript", () => {
    afterEach(() => {
      delete document.documentElement.dataset.colorTheme;
    });

    function run(stored: string | null) {
      const store: Record<string, string> = stored === null ? {} : { [COLOR_THEME_PERSISTENCE_KEY]: stored };
      const original = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
      Object.defineProperty(globalThis, "localStorage", {
        configurable: true,
        value: { getItem: (k: string) => store[k] ?? null },
      });
      try {
        new Function(buildNoFlashScript())();
      } finally {
        if (original) Object.defineProperty(globalThis, "localStorage", original);
        else delete (globalThis as { localStorage?: unknown }).localStorage;
      }
      return document.documentElement.dataset.colorTheme;
    }

    it("keeps a stored valid theme", () => {
      expect(run("retro-mac")).toBe("retro-mac");
    });

    it("falls back to griddo for a removed stored id", () => {
      expect(run("terminal")).toBe("griddo");
    });

    it("uses griddo when nothing is stored", () => {
      expect(run(null)).toBe("griddo");
    });
  });
});
