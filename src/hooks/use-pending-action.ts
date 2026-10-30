"use client";

import { useCallback, useRef, useState } from "react";

/**
 * A server-confirmed action (SPEC §Write feel, group 3): the control that started it is busy
 * until the function answers, and a second press while it runs does nothing. The busy state is
 * immediate; the loader inside it waits for `DISPLAY_DELAY_MS` (`PendingLoader`).
 */
export function usePendingAction() {
  const [busy, setBusy] = useState(false);
  const runningRef = useRef(false);

  const run = useCallback(async <T,>(action: () => Promise<T>): Promise<T | undefined> => {
    if (runningRef.current) return undefined;
    runningRef.current = true;
    setBusy(true);
    try {
      return await action();
    } finally {
      runningRef.current = false;
      setBusy(false);
    }
  }, []);

  return { busy, run };
}
