"use client";

import { StatusIcon } from "@/components/feedback/status-icon";

/**
 * The feedback F03 loader of a server-confirmed control (SPEC §Write feel, group 3): nothing
 * for the first `DISPLAY_DELAY_MS` of the wait, then the one app-wide loader. `sentence` names
 * the wait for screen readers.
 */
export function PendingLoader({ busy, sentence }: { busy: boolean; sentence: string }) {
  if (!busy) return null;
  return <StatusIcon sentence={sentence} status="pending" />;
}
