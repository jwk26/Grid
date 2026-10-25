"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Palette } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { COLOR_THEMES } from "@/lib/color-themes";
import { useColorThemeStore } from "@/stores/color-theme-store";

const THEME_LABELS: Record<(typeof COLOR_THEMES)[number], string> = {
  "griddo": "GridDO",
  "neumorphism": "New Morphism",
  "claymorphism": "3D Clay",
  "retro-mac": "Retro Mac",
};

export function ColorThemeToggle() {
  const [open, setOpen] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const colorTheme = useColorThemeStore((state) => state.colorTheme);
  const setColorTheme = useColorThemeStore((state) => state.setColorTheme);

  useEffect(() => {
    if (!open) return;

    const selectedRow = contentRef.current?.querySelector<HTMLButtonElement>(
      '[aria-pressed="true"]',
    );
    selectedRow?.focus();
  }, [open]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="Change color theme"
          className={cn(
            "flex h-10 w-10 items-center justify-center rounded-lg border border-transparent p-2.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
            open
              ? "bg-accent text-foreground"
              : "text-muted-foreground hover:bg-accent hover:text-foreground",
          )}
        >
          <Palette className="h-5 w-5" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        ref={contentRef}
        side="right"
        align="end"
        sideOffset={12}
        className="w-56 p-1 bg-popover border border-border shadow-md rounded-lg"
      >
        {COLOR_THEMES.map((theme) => {
          const isSelected = theme === colorTheme;

          return (
            <button
              key={theme}
              type="button"
              aria-pressed={isSelected}
              className={cn(
                "flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm font-medium transition-colors",
                isSelected
                  ? "bg-accent text-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground",
              )}
              onClick={() => {
                setColorTheme(theme);
                setOpen(false);
              }}
            >
              <span
                aria-hidden="true"
                className="h-4 w-4 rounded-full ring-1 ring-border/40 shrink-0"
                style={{ backgroundColor: `var(--color-theme-swatch-${theme})` }}
              />
              {THEME_LABELS[theme]}
              {isSelected && <Check className="h-4 w-4 ml-auto shrink-0" />}
            </button>
          );
        })}
      </PopoverContent>
    </Popover>
  );
}
