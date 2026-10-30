"use client";

import dynamic from "next/dynamic";
import { ThemeProvider } from "next-themes";
import { Suspense, useEffect } from "react";
import type { ReactNode } from "react";
import { BitDetailPopup } from "@/components/bit-detail/bit-detail-popup";
import { AppToaster } from "@/components/feedback/app-toaster";
import { AppFrame } from "@/components/layout/app-frame";
import { ColorThemeProvider } from "@/components/layout/color-theme-provider";
import { SearchOverlay } from "@/components/layout/search-overlay";
import { QuickCaptureOverlays } from "@/components/quick-capture/quick-capture-overlays";
import { getConnectionMonitor } from "@/lib/db/connection";
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

function ConnectionMonitorRunner() {
  useEffect(() => {
    const monitor = getConnectionMonitor();
    monitor.start();
    return () => monitor.stop();
  }, []);
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
        <AppFrame>
          <TrashAutoCleanup />
          <ConnectionMonitorRunner />
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
        </AppFrame>
        <AppToaster />
        {StateSwitchPanel ? <StateSwitchPanel /> : null}
      </ColorThemeProvider>
    </ThemeProvider>
  );
}
