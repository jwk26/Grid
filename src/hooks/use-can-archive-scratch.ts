"use client";

import { useCallback, useEffect, useState } from "react";
import {
  type ScratchArchiveEligibility,
  liveRead,
} from "@/lib/db/datastore";
import type { ScratchTitleBlockerSnapshot } from "@/hooks/use-scratch-breakdowns";

export type ScratchCompletionPresentation = "working" | "overlay" | "complete";

export type ScratchCompletionWithdrawalReason =
  | "active-breakdown"
  | "staging"
  | "breakdown-and-staging";

type CompletionBlockers = Readonly<{
  hasAddDraft: boolean;
  titleBlocker: ScratchTitleBlockerSnapshot | null;
}>;

type EligibilitySnapshot = Readonly<{
  scratchId: string;
  eligibility: ScratchArchiveEligibility;
}>;

type CompletionRecord = {
  eligible: boolean;
  hasPresentedCompletion: boolean;
  presentation: ScratchCompletionPresentation;
};

type CompletionMachine = {
  input: {
    scratchId: string | null;
    isReady: boolean;
    eligible: boolean;
  };
  records: Map<string, CompletionRecord>;
};

const EMPTY_ELIGIBILITY: ScratchArchiveEligibility = {
  eligible: false,
  scratch: null,
  consumedCount: 0,
  unconsumedCount: 0,
  stagedCandidateCount: 0,
};

export function useCanArchiveScratch(
  scratchId: string | null,
  blockers: CompletionBlockers,
) {
  const [snapshot, setSnapshot] = useState<EligibilitySnapshot | null>(null);
  const [machine, setMachine] = useState<CompletionMachine>({
    input: { scratchId: null, isReady: false, eligible: false },
    records: new Map(),
  });

  useEffect(() => {
    if (scratchId === null) return;
    const subscription = liveRead(async (dataStore) => {
      return {
        scratchId,
        eligibility: await dataStore.getScratchArchiveEligibility(scratchId),
      };
    }).subscribe({
      next: setSnapshot,
      error: (error) => console.error("Scratch Archive eligibility error:", error),
    });
    return () => subscription.unsubscribe();
  }, [scratchId]);

  const currentSnapshot = snapshot?.scratchId === scratchId ? snapshot : null;
  const isReady = scratchId !== null && currentSnapshot !== null;
  const persistedEligible = currentSnapshot?.eligibility.eligible ?? false;
  const eligible =
    isReady &&
    persistedEligible &&
    !blockers.hasAddDraft &&
    blockers.titleBlocker === null;

  const inputChanged =
    machine.input.scratchId !== scratchId ||
    machine.input.isReady !== isReady ||
    machine.input.eligible !== eligible;
  let currentMachine = machine;
  if (inputChanged) {
    const records = new Map(machine.records);
    const switchedScratch = machine.input.scratchId !== scratchId;
    if (switchedScratch && machine.input.scratchId !== null) {
      const previous = records.get(machine.input.scratchId);
      if (previous?.presentation === "overlay") {
        records.set(machine.input.scratchId, {
          ...previous,
          presentation: "complete",
        });
      }
    }

    if (scratchId !== null && isReady) {
      const previous = records.get(scratchId);
      const enteredReadyTruth = switchedScratch || !machine.input.isReady;
      let record: CompletionRecord;
      if (previous === undefined || enteredReadyTruth) {
        record = {
          eligible,
          hasPresentedCompletion: eligible,
          presentation: eligible ? "complete" : "working",
        };
      } else if (!eligible) {
        record = {
          eligible: false,
          hasPresentedCompletion: previous.hasPresentedCompletion,
          presentation: "working",
        };
      } else if (!previous.eligible) {
        record = {
          eligible: true,
          hasPresentedCompletion: true,
          presentation: "overlay",
        };
      } else {
        record = previous;
      }
      records.set(scratchId, record);
    }

    currentMachine = {
      input: { scratchId, isReady, eligible },
      records,
    };
    setMachine(currentMachine);
  }

  const cancel = useCallback(() => {
    if (scratchId === null || !eligible) return;
    setMachine((current) => {
      const record = current.records.get(scratchId);
      if (record === undefined || record.presentation !== "overlay") return current;
      const records = new Map(current.records);
      records.set(scratchId, { ...record, presentation: "complete" });
      return { ...current, records };
    });
  }, [eligible, scratchId]);

  const reopen = useCallback(() => {
    if (scratchId === null || !eligible) return;
    setMachine((current) => {
      const record = current.records.get(scratchId);
      if (record === undefined || record.presentation !== "complete") return current;
      const records = new Map(current.records);
      records.set(scratchId, { ...record, presentation: "overlay" });
      return { ...current, records };
    });
  }, [eligible, scratchId]);

  const presentation =
    scratchId === null || !isReady
      ? "working"
      : currentMachine.records.get(scratchId)?.presentation ?? "working";
  const currentRecord =
    scratchId === null ? undefined : currentMachine.records.get(scratchId);
  const activeBreakdown =
    (currentSnapshot?.eligibility.unconsumedCount ?? 0) > 0;
  const activeStaging =
    (currentSnapshot?.eligibility.stagedCandidateCount ?? 0) > 0;
  const withdrawalReason: ScratchCompletionWithdrawalReason | null =
    currentRecord?.hasPresentedCompletion === true &&
    presentation === "working" &&
    !persistedEligible &&
    currentSnapshot?.eligibility.scratch !== null &&
    (activeBreakdown || activeStaging)
      ? activeBreakdown && activeStaging
        ? "breakdown-and-staging"
        : activeBreakdown
          ? "active-breakdown"
          : "staging"
      : null;

  return {
    isReady,
    eligibility: currentSnapshot?.eligibility ?? EMPTY_ELIGIBILITY,
    persistedEligible,
    eligible,
    presentation,
    completionBlockers: {
      addDraft: persistedEligible && blockers.hasAddDraft,
      title: persistedEligible ? blockers.titleBlocker : null,
    },
    withdrawalReason,
    cancel,
    reopen,
  } as const;
}
