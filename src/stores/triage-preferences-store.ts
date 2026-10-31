"use client";

import { create } from "zustand";
import { persist, type PersistStorage } from "zustand/middleware";

export const CREATED_AT_SORT_DIRECTIONS = ["ASC", "DESC"] as const;

export type CreatedAtSortDirection =
  (typeof CREATED_AT_SORT_DIRECTIONS)[number];

const DEFAULT_CREATED_AT_SORT: CreatedAtSortDirection = "DESC";

export const TRIAGE_PREFERENCES_PERSISTENCE_KEY =
  "griddo-triage-preferences";

export function validateCreatedAtSort(
  value: unknown,
): CreatedAtSortDirection {
  return value === "ASC" || value === "DESC"
    ? value
    : DEFAULT_CREATED_AT_SORT;
}

/** A saved Scratch id is any non-empty string; whether it still resolves is checked at restore time. */
export function validateLastSelectedScratchId(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

interface PersistedTriagePreferences {
  poolCreatedAtSort: CreatedAtSortDirection;
  breakdownCreatedAtSort: CreatedAtSortDirection;
  lastSelectedScratchId: string | null;
}

interface TriagePreferencesState extends PersistedTriagePreferences {
  setPoolCreatedAtSort: (sort: CreatedAtSortDirection) => void;
  setBreakdownCreatedAtSort: (sort: CreatedAtSortDirection) => void;
  setLastSelectedScratchId: (id: string | null) => void;
}

function normalizePersistedPreferences(
  value: unknown,
): PersistedTriagePreferences {
  const preferences =
    typeof value === "object" && value !== null
      ? (value as Record<string, unknown>)
      : {};

  return {
    poolCreatedAtSort: validateCreatedAtSort(preferences.poolCreatedAtSort),
    breakdownCreatedAtSort: validateCreatedAtSort(
      preferences.breakdownCreatedAtSort,
    ),
    lastSelectedScratchId: validateLastSelectedScratchId(
      preferences.lastSelectedScratchId,
    ),
  };
}

function parsePersistedPreferences(raw: string): PersistedTriagePreferences {
  try {
    return normalizePersistedPreferences(JSON.parse(raw));
  } catch {
    return normalizePersistedPreferences(null);
  }
}

function serializePersistedPreferences(value: unknown): string {
  return JSON.stringify(normalizePersistedPreferences(value));
}

const triagePreferencesStorage: PersistStorage<PersistedTriagePreferences> = {
  getItem(name) {
    try {
      if (typeof localStorage === "undefined") return null;
      const raw = localStorage.getItem(name);
      if (raw === null) return null;
      const state = parsePersistedPreferences(raw);
      localStorage.setItem(name, serializePersistedPreferences(state));
      return { state };
    } catch {
      return null;
    }
  },
  setItem(name, value) {
    try {
      if (typeof localStorage === "undefined") return;
      localStorage.setItem(
        name,
        serializePersistedPreferences({
          poolCreatedAtSort: validateCreatedAtSort(
            value.state.poolCreatedAtSort,
          ),
          breakdownCreatedAtSort: validateCreatedAtSort(
            value.state.breakdownCreatedAtSort,
          ),
          lastSelectedScratchId: validateLastSelectedScratchId(
            value.state.lastSelectedScratchId,
          ),
        }),
      );
    } catch {
      // Device-local preferences are optional in restricted environments.
    }
  },
  removeItem(name) {
    try {
      if (typeof localStorage === "undefined") return;
      localStorage.removeItem(name);
    } catch {
      // Device-local preferences are optional in restricted environments.
    }
  },
};

export const useTriagePreferencesStore = create<TriagePreferencesState>()(
  persist<TriagePreferencesState, [], [], PersistedTriagePreferences>(
    (set, get) => ({
      poolCreatedAtSort: DEFAULT_CREATED_AT_SORT,
      breakdownCreatedAtSort: DEFAULT_CREATED_AT_SORT,
      lastSelectedScratchId: null,
      setPoolCreatedAtSort: (sort) =>
        set({ poolCreatedAtSort: validateCreatedAtSort(sort) }),
      setBreakdownCreatedAtSort: (sort) =>
        set({ breakdownCreatedAtSort: validateCreatedAtSort(sort) }),
      // An unchanged id must not call set: persist writes on every set and
      // would rewrite the sorts from this tab's memory, overwriting a sort
      // another tab changed.
      setLastSelectedScratchId: (id) => {
        const next = validateLastSelectedScratchId(id);
        if (next === get().lastSelectedScratchId) return;
        set({ lastSelectedScratchId: next });
      },
    }),
    {
      name: TRIAGE_PREFERENCES_PERSISTENCE_KEY,
      storage: triagePreferencesStorage,
      partialize: (state) => ({
        poolCreatedAtSort: state.poolCreatedAtSort,
        breakdownCreatedAtSort: state.breakdownCreatedAtSort,
        lastSelectedScratchId: state.lastSelectedScratchId,
      }),
      merge: (persistedState, currentState) => ({
        ...currentState,
        ...normalizePersistedPreferences(persistedState),
      }),
    },
  ),
);
