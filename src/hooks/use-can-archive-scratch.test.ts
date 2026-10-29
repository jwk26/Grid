import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ScratchArchiveEligibility } from "@/lib/db/datastore";
import { useCanArchiveScratch } from "@/hooks/use-can-archive-scratch";

const eligibilityByScratch = vi.hoisted(
  () => new Map<string, ScratchArchiveEligibility>(),
);
const listeners = vi.hoisted(() => new Set<() => void>());

vi.mock("@/lib/db/datastore", () => {
  const store = {
    getScratchArchiveEligibility: async (scratchId: string) =>
      eligibilityByScratch.get(scratchId) ?? eligibility(false),
  };
  return {
    getDataStore: async () => store,
    liveRead: (read: (store: unknown) => Promise<unknown>) => {
      const query = () => read(store);
      return {
        subscribe: (observer: { next: (value: unknown) => void; error: (error: unknown) => void }) => {
          let active = true;
          const publish = () => {
            void query().then(
              (value) => {
                if (active) observer.next(value);
              },
              (error) => {
                if (active) observer.error(error);
              },
            );
          };
          listeners.add(publish);
          publish();
          return {
            unsubscribe: () => {
              active = false;
              listeners.delete(publish);
            },
          };
        },
      };
    },
  };
});

function eligibility(
  eligible: boolean,
  overrides: Partial<ScratchArchiveEligibility> = {},
): ScratchArchiveEligibility {
  return {
    eligible,
    scratch: null,
    consumedCount: eligible ? 1 : 0,
    unconsumedCount: 0,
    stagedCandidateCount: 0,
    ...overrides,
  };
}

async function publishEligibility() {
  await act(async () => {
    for (const listener of listeners) listener();
  });
}

describe("useCanArchiveScratch", () => {
  beforeEach(() => {
    eligibilityByScratch.clear();
    listeners.clear();
  });

  it.each([
    ["inactive Scratch", eligibility(false, { consumedCount: 1 })],
    ["never used", eligibility(false)],
    ["unconsumed row", eligibility(false, { consumedCount: 1, unconsumedCount: 1 })],
    ["staged candidate", eligibility(false, { consumedCount: 1, stagedCandidateCount: 1 })],
  ])("fails closed for %s Task 125 truth", async (_label, snapshot) => {
    eligibilityByScratch.set("scratch-1", snapshot);

    const { result } = renderHook(() =>
      useCanArchiveScratch("scratch-1", {
        hasAddDraft: false,
        titleBlocker: null,
      }),
    );

    await waitFor(() => expect(result.current.isReady).toBe(true));
    expect(result.current.persistedEligible).toBe(false);
    expect(result.current.eligible).toBe(false);
    expect(result.current.presentation).toBe("working");
  });

  it("uses already-eligible entry as a complete baseline and auto-opens only after false-to-true", async () => {
    eligibilityByScratch.set("scratch-1", eligibility(true));
    const { result } = renderHook(() =>
      useCanArchiveScratch("scratch-1", {
        hasAddDraft: false,
        titleBlocker: null,
      }),
    );

    await waitFor(() => expect(result.current.isReady).toBe(true));
    expect(result.current.presentation).toBe("complete");

    eligibilityByScratch.set(
      "scratch-1",
      eligibility(false, { consumedCount: 1, unconsumedCount: 1 }),
    );
    await publishEligibility();
    await waitFor(() => expect(result.current.presentation).toBe("working"));

    eligibilityByScratch.set("scratch-1", eligibility(true));
    await publishEligibility();
    await waitFor(() => expect(result.current.presentation).toBe("overlay"));
  });

  it.each(["open", "dirty", "saving", "conflicted", "reconciling"] as const)(
    "combines the %s title blocker without persisting or changing Task 125 truth",
    async (titleBlocker) => {
      eligibilityByScratch.set("scratch-1", eligibility(true));
      const { result } = renderHook(() =>
        useCanArchiveScratch("scratch-1", {
          hasAddDraft: false,
          titleBlocker,
        }),
      );

      await waitFor(() => expect(result.current.isReady).toBe(true));
      expect(result.current.persistedEligible).toBe(true);
      expect(result.current.eligible).toBe(false);
      expect(result.current.presentation).toBe("working");
    },
  );

  it("treats a non-empty Add draft as a transient blocker and opens when it clears", async () => {
    eligibilityByScratch.set("scratch-1", eligibility(true));
    let hasAddDraft = true;
    const { result, rerender } = renderHook(() =>
      useCanArchiveScratch("scratch-1", {
        hasAddDraft,
        titleBlocker: null,
      }),
    );

    await waitFor(() => expect(result.current.isReady).toBe(true));
    expect(result.current.persistedEligible).toBe(true);
    expect(result.current.presentation).toBe("working");

    hasAddDraft = false;
    rerender();
    await waitFor(() => expect(result.current.presentation).toBe("overlay"));
  });

  it("exposes only otherwise-eligible Add and title blockers without changing persisted truth", async () => {
    eligibilityByScratch.set("scratch-1", eligibility(true));
    let hasAddDraft = true;
    let titleBlocker: "dirty" | null = "dirty";
    const { result, rerender } = renderHook(() =>
      useCanArchiveScratch("scratch-1", { hasAddDraft, titleBlocker }),
    );

    await waitFor(() => expect(result.current.isReady).toBe(true));
    expect(result.current.completionBlockers).toEqual({
      addDraft: true,
      title: "dirty",
    });
    expect(result.current.persistedEligible).toBe(true);

    hasAddDraft = false;
    titleBlocker = null;
    rerender();
    expect(result.current.completionBlockers).toEqual({
      addDraft: false,
      title: null,
    });

    eligibilityByScratch.set(
      "scratch-1",
      eligibility(false, { consumedCount: 1, unconsumedCount: 1 }),
    );
    hasAddDraft = true;
    titleBlocker = "dirty";
    await publishEligibility();
    rerender();
    await waitFor(() =>
      expect(result.current.completionBlockers).toEqual({
        addDraft: false,
        title: null,
      }),
    );
  });

  it.each([
    [1, 0, "active-breakdown"],
    [0, 1, "staging"],
    [1, 1, "breakdown-and-staging"],
  ] as const)(
    "reports mounted completion withdrawal for active=%i staged=%i",
    async (unconsumedCount, stagedCandidateCount, reason) => {
      eligibilityByScratch.set("scratch-1", eligibility(true));
      const { result } = renderHook(() =>
        useCanArchiveScratch("scratch-1", {
          hasAddDraft: false,
          titleBlocker: null,
        }),
      );
      await waitFor(() => expect(result.current.presentation).toBe("complete"));

      eligibilityByScratch.set(
        "scratch-1",
        eligibility(false, {
          scratch: { id: "scratch-1" } as ScratchArchiveEligibility["scratch"],
          consumedCount: 1,
          unconsumedCount,
          stagedCandidateCount,
        }),
      );
      await publishEligibility();

      await waitFor(() => expect(result.current.withdrawalReason).toBe(reason));
      expect(result.current.presentation).toBe("working");

      eligibilityByScratch.set("scratch-1", eligibility(true));
      await publishEligibility();
      await waitFor(() => expect(result.current.withdrawalReason).toBeNull());
      expect(result.current.presentation).toBe("overlay");
    },
  );

  it("does not report withdrawal before completion presentation or for an inactive Scratch", async () => {
    eligibilityByScratch.set(
      "scratch-1",
      eligibility(false, {
        scratch: { id: "scratch-1" } as ScratchArchiveEligibility["scratch"],
        consumedCount: 1,
        unconsumedCount: 1,
      }),
    );
    const { result } = renderHook(() =>
      useCanArchiveScratch("scratch-1", {
        hasAddDraft: false,
        titleBlocker: null,
      }),
    );
    await waitFor(() => expect(result.current.isReady).toBe(true));
    expect(result.current.withdrawalReason).toBeNull();

    eligibilityByScratch.set("scratch-1", eligibility(true));
    await publishEligibility();
    await waitFor(() => expect(result.current.presentation).toBe("overlay"));
    eligibilityByScratch.set(
      "scratch-1",
      eligibility(false, { consumedCount: 1, unconsumedCount: 1, scratch: null }),
    );
    await publishEligibility();
    await waitFor(() => expect(result.current.presentation).toBe("working"));
    expect(result.current.withdrawalReason).toBeNull();
  });

  it("keeps Cancel/Reopen page-local and returns to complete after a Scratch switch", async () => {
    eligibilityByScratch.set("scratch-1", eligibility(false));
    eligibilityByScratch.set("scratch-2", eligibility(true));
    let scratchId = "scratch-1";
    const { result, rerender } = renderHook(() =>
      useCanArchiveScratch(scratchId, {
        hasAddDraft: false,
        titleBlocker: null,
      }),
    );
    await waitFor(() => expect(result.current.isReady).toBe(true));

    eligibilityByScratch.set("scratch-1", eligibility(true));
    await publishEligibility();
    await waitFor(() => expect(result.current.presentation).toBe("overlay"));

    act(() => result.current.cancel());
    expect(result.current.presentation).toBe("complete");
    rerender();
    expect(result.current.presentation).toBe("complete");
    act(() => result.current.reopen());
    expect(result.current.presentation).toBe("overlay");

    scratchId = "scratch-2";
    rerender();
    await waitFor(() => expect(result.current.presentation).toBe("complete"));
    scratchId = "scratch-1";
    rerender();
    await waitFor(() => expect(result.current.presentation).toBe("complete"));
  });
});
