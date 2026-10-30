"use client";

import { useSyncExternalStore } from "react";
import { getSessionController, type SessionVariant } from "@/lib/auth/session";

/** `account` for a signed-in OAuth user, `guest` otherwise (and before the browser has a session). */
export function useSessionVariant(): SessionVariant {
  const controller = typeof window === "undefined" ? null : getSessionController();
  return useSyncExternalStore(
    (listener) => controller?.subscribe(listener) ?? (() => undefined),
    () => controller?.getVariant() ?? "guest",
    () => "guest" as const,
  );
}
