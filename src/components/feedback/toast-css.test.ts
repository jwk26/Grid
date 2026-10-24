import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const css = readFileSync(join(process.cwd(), "src/app/globals.css"), "utf8");
const providers = readFileSync(join(process.cwd(), "src/app/providers.tsx"), "utf8");

function rule(selectorPart: string): string {
  const start = css.indexOf(selectorPart);
  expect(start, `selector ${selectorPart}`).toBeGreaterThanOrEqual(0);
  return css.slice(start, css.indexOf("}", start));
}

describe("toast stylesheet (DP-FB-01)", () => {
  it.each(["success", "warning", "error"])(
    "colours the %s toast through the status tokens",
    (kind) => {
      const block = rule(`[data-styled="true"][data-type="${kind}"] {`);

      expect(block).toContain(`--toast-kind: var(--status-${kind})`);
      expect(block).toContain(`--toast-surface: var(--status-${kind}-surface)`);
      expect(block).toContain(`--toast-foreground: var(--status-${kind}-foreground)`);
      expect(block).toContain(`--toast-border: var(--status-${kind}-border)`);
    },
  );

  it("draws every toast from those variables with the theme shadow and font", () => {
    const block = rule('.toast-stack[data-sonner-toaster] [data-sonner-toast][data-styled="true"] {');

    expect(block).toContain("background: hsl(var(--toast-surface))");
    expect(block).toContain("color: hsl(var(--toast-foreground))");
    expect(block).toContain("border: 1px solid hsl(var(--toast-border))");
    expect(block).toContain("border-radius: 12px");
    expect(block).toContain("box-shadow: var(--theme-shadow)");
    expect(block).toContain("font-family: var(--theme-font)");
  });

  it("squares the corners and offsets the shadow in retro-mac", () => {
    const block = rule(':root[data-color-theme="retro-mac"] .toast-stack');

    expect(block).toContain("border-radius: 0");
    expect(block).toContain("box-shadow: 2px 2px 0 hsl(var(--foreground))");
  });

  it("hides the close control on success only", () => {
    expect(rule('[data-type="success"] [data-close-button] {')).toContain("display: none");
  });

  it("makes the stack translucent and pointer-transparent during a drag", () => {
    const block = rule(".toast-stack-dragging[data-sonner-toaster] {");

    expect(block).toContain("opacity: 0.5");
    expect(block).toContain("pointer-events: none");
  });

  it("keeps the toast block before the colour theme blocks", () => {
    expect(css.indexOf(".toast-stack-dragging")).toBeLessThan(
      css.indexOf("/* ── Color Theme Overrides (Batch 2) ── */"),
    );
  });

  it("does not use sonner's rich colours", () => {
    expect(providers).not.toContain("richColors");
  });
});
