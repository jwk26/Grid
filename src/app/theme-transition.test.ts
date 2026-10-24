import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const projectRoot = process.cwd();

describe("theme transition wiring", () => {
  it("allows theme color transitions and defines the shared theme duration", () => {
    const providers = readFileSync(join(projectRoot, "src/app/providers.tsx"), "utf8");
    const globals = readFileSync(join(projectRoot, "src/app/globals.css"), "utf8");

    expect(providers).not.toContain("disableTransitionOnChange");
    expect(globals).toContain("--motion-duration-theme: 300ms;");
    expect(globals).toContain("transition: background-color var(--motion-duration-theme)");
  });

  it("includes Batch 2 exact theme values and preserves cascade/inheritance", () => {
    const globals = readFileSync(join(projectRoot, "src/app/globals.css"), "utf8");

    // ── Base / default layer (griddo) ────────────────────────────────────────
    // Core contract defaults
    expect(globals).toContain("--theme-shadow: 0 4px 14px rgba(15, 23, 42, 0.1);");
    expect(globals).toContain("--theme-shadow-hover: 0 10px 24px rgba(15, 23, 42, 0.14);");
    expect(globals).toContain("--theme-radius: 1.5rem;");
    expect(globals).toContain("--theme-border-width: 1px;");
    expect(globals).toContain("--theme-card-bg: hsl(var(--card));");

    // Calendar defaults
    expect(globals).toContain("--calendar-today-border-width: 2px;");
    expect(globals).toContain("--calendar-today-border-color: hsl(var(--primary));");
    expect(globals).toContain("--calendar-today-shadow: var(--calendar-cell-shadow);");
    expect(globals).toContain("--calendar-cell-bg: hsl(var(--card) / 0.8);");

    // Swatch spot checks
    expect(globals).toContain("--color-theme-swatch-griddo: hsl(38 28% 91%);");

    // ── .dark base shadow overrides ──────────────────────────────────────────
    expect(globals).toContain("--theme-shadow: 0 4px 14px rgba(0, 0, 0, 0.3);");
    expect(globals).toContain("--theme-shadow-hover: 0 10px 24px rgba(0, 0, 0, 0.4);");

    // ── Shared component classes ─────────────────────────────────────────────
    expect(globals).toContain(".theme-node-card");
    expect(globals).toContain(".theme-node-card:hover");
    expect(globals).toContain(".theme-grid-line");
    expect(globals).toContain(".theme-surface");
    expect(globals).toContain(".theme-surface:hover");

    // ── All 3 override selectors present ────────────────────────────────────
    expect(globals).toContain('data-color-theme="neumorphism"');
    expect(globals).toContain('data-color-theme="claymorphism"');
    expect(globals).toContain('data-color-theme="retro-mac"');

    // ── griddo has NO override block (it IS the base layer) ─────────────────
    expect(globals).not.toContain('data-color-theme="griddo"');

    // ── Exact shadow/calendar spot checks per theme ──────────────────────────
    // neumorphism: paired extrusion shadows
    expect(globals).toContain("--theme-shadow: 8px 8px 16px #c5c9d1, -8px -8px 16px #ffffff;");
    expect(globals).toContain("--theme-shadow-hover: 12px 12px 20px #c5c9d1, -12px -12px 20px #ffffff;");
    expect(globals).toContain("--calendar-today-shadow: inset 4px 4px 8px #c5c9d1, inset -4px -4px 8px #ffffff;");

    // claymorphism: 4-part clay shadow
    expect(globals).toContain(
      "--theme-shadow: 6px 6px 12px rgba(0, 0, 0, 0.1), -6px -6px 12px rgba(255, 255, 255, 0.9), inset 4px 4px 8px rgba(255, 255, 255, 0.9), inset -4px -4px 8px rgba(0, 0, 0, 0.05);"
    );

    // retro-mac: hard offset shadow
    expect(globals).toContain("--theme-shadow: 2px 2px 0px rgba(0, 0, 0, 1);");
    expect(globals).toContain("--theme-shadow-hover: 4px 4px 0px rgba(0, 0, 0, 1);");
  });

  it("switches theme and dark mode through CSS and attributes only, so no workflow state is touched (Task 179)", () => {
    const store = readFileSync(join(projectRoot, "src/stores/color-theme-store.ts"), "utf8");
    const providers = readFileSync(join(projectRoot, "src/app/providers.tsx"), "utf8");
    // the colour theme is one persisted preference applied to the document, not a route or data change
    expect(store).toContain("setColorTheme: (theme) => set({ colorTheme: validateColorTheme(theme) })");
    expect(store).not.toMatch(/router|location\.|fetch\(|indexedDB|datastore/i);
    expect(providers).not.toMatch(/key=\{[^}]*(theme|colorTheme)/);
  });

  it("gives every neumorphism dark token a light counterpart and no dark-only literal colour in a rule (Task 179)", () => {
    const globals = readFileSync(join(projectRoot, "src/app/globals.css"), "utf8");
    const blockOf = (selector: string) => {
      const start = globals.indexOf(`${selector} {`);
      return globals.slice(start, globals.indexOf("\n}\n", start));
    };
    const light = new Set([...blockOf(':root[data-color-theme="neumorphism"]').matchAll(/(--[\w-]+):/g)].map((m) => m[1]));
    const dark = [...blockOf('.dark[data-color-theme="neumorphism"]').matchAll(/(--[\w-]+):/g)].map((m) => m[1]);
    expect(dark.length).toBeGreaterThan(20);
    for (const name of dark) expect(light.has(name), `${name} is dark-only`).toBe(true);
    const rules = globals.slice(globals.indexOf("/* Neumorphism L1 (Task 173)"));
    expect(rules).not.toMatch(/\.dark\[data-color-theme="neumorphism"\][^{]*\{[^}]*#[0-9a-fA-F]{3,8}/);
  });

  it("runs the neumorphism motion only outside reduced motion: the shared reset and the per-rule guards (Task 179)", () => {
    const globals = readFileSync(join(projectRoot, "src/app/globals.css"), "utf8");
    expect(globals).toMatch(/@media \(prefers-reduced-motion: reduce\) \{[^]*?animation-duration: 0\.01ms !important;[^]*?transition-duration: 0\.01ms !important;/);
    const start = globals.indexOf("/* Task 179: Pool collapse/expand motion.");
    const motion = globals.slice(start, globals.indexOf("/* mi-12:", start));
    for (const rule of motion.match(/[^{}]*\{[^{}]*\banimation: [^{}]*\}/g) ?? []) {
      expect(rule).toContain(":not(.transition-none)");
    }
  });
});
