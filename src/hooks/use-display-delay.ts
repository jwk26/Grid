"use client";

import { useEffect, useState } from "react";
import { DISPLAY_DELAY_MS } from "@/lib/constants";

type DelayState = { phase: string | null; due: boolean };

/**
 * Whether a pending or reconciling presentation is visible yet (feedback F02).
 *
 * `phase` names the current phase of the thing being waited on (for example an
 * operation id plus its state), or `null` when nothing is. Visibility starts
 * `delayMs` after the phase begins and restarts whenever the phase changes. The
 * hook only postpones presentation: it takes no command state, reads none and
 * changes none, so it can never decide that anything succeeded.
 */
export function useDisplayDelay(
  phase: string | null,
  delayMs: number = DISPLAY_DELAY_MS,
): boolean {
  const [state, setState] = useState<DelayState>({ phase: null, due: false });

  // A new phase starts undelayed: reset during render so the old phase's
  // visibility never carries over for even one frame.
  if (state.phase !== phase) {
    setState({ phase, due: false });
  }

  useEffect(() => {
    if (phase === null) return;
    const timer = setTimeout(() => {
      setState((current) =>
        current.phase === phase ? { phase, due: true } : current,
      );
    }, delayMs);
    return () => clearTimeout(timer);
  }, [phase, delayMs]);

  return phase !== null && state.phase === phase && state.due;
}
