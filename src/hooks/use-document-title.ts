"use client";

import { useEffect } from "react";
import { tabTitle } from "@/lib/copy/feedback";

/**
 * Sets the tab title of the page (SPEC §Feedback copy). Each page sets its own,
 * so client navigation never leaves a stale one; `pageName` is `null` on L0,
 * where the app name stands alone.
 */
export function useDocumentTitle(pageName: string | null): void {
  useEffect(() => {
    document.title = tabTitle(pageName);
  }, [pageName]);
}
