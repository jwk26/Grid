"use client";

import dynamic from "next/dynamic";
import { ThemeProvider } from "next-themes";
import { Suspense } from "react";
import type { ReactNode } from "react";
import { BitDetailPopup } from "@/components/bit-detail/bit-detail-popup";
import { AppToaster } from "@/components/feedback/app-toaster";
import { ColorThemeProvider } from "@/components/layout/color-theme-provider";
import { SearchOverlay } from "@/components/layout/search-overlay";
import { QuickCaptureOverlays } from "@/components/quick-capture/quick-capture-overlays";
import { useSystemNodeSeeding } from "@/hooks/use-system-node-seeding";
import { useTrashAutoCleanup } from "@/hooks/use-trash-auto-cleanup";

// Development state switch (feedback F30): never part of a production bundle.
const StateSwitchPanel =
  process.env.NODE_ENV === "development"
    ? dynamic(
        () =>
          import("@/components/dev/state-switch-panel").then(
            (module) => module.StateSwitchPanel,
          ),
        { ssr: false },
      )
    : null;

function TrashAutoCleanup() {
  useTrashAutoCleanup();
  return null;
}

function SystemNodeSeeding() {
  useSystemNodeSeeding();
  return null;
}

export default function Providers({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
    >
      <ColorThemeProvider>
        <TrashAutoCleanup />
        <SystemNodeSeeding />
        {children}
        <Suspense>
          <QuickCaptureOverlays />
        </Suspense>
        <Suspense>
          <SearchOverlay />
        </Suspense>
        <Suspense>
          <BitDetailPopup />
        </Suspense>
        <AppToaster />
        {StateSwitchPanel ? <StateSwitchPanel /> : null}
      </ColorThemeProvider>
    </ThemeProvider>
  );
}
