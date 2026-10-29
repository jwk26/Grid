import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import {
  TRIAGE_PREFERENCES_PERSISTENCE_KEY,
  useTriagePreferencesStore,
  validateCreatedAtSort,
} from "./triage-preferences-store";

const localStorageMock = (() => {
  let values: Record<string, string> = {};

  return {
    getItem: (key: string): string | null => values[key] ?? null,
    setItem: (key: string, value: string): void => {
      values[key] = value;
    },
    removeItem: (key: string): void => {
      delete values[key];
    },
    clear: (): void => {
      values = {};
    },
    get length() {
      return Object.keys(values).length;
    },
    key: (index: number): string | null => Object.keys(values)[index] ?? null,
  };
})();

beforeAll(() => {
  vi.stubGlobal("localStorage", localStorageMock);
});

afterAll(() => {
  vi.unstubAllGlobals();
});

beforeEach(() => {
  useTriagePreferencesStore.setState({
    poolCreatedAtSort: "DESC",
    breakdownCreatedAtSort: "DESC",
    lastSelectedScratchId: null,
  });
  localStorageMock.clear();
});

afterEach(() => {
  localStorageMock.clear();
});

describe("triage-preferences-store", () => {
  it("defaults each created-at sort independently to DESC", () => {
    expect(useTriagePreferencesStore.getState()).toMatchObject({
      poolCreatedAtSort: "DESC",
      breakdownCreatedAtSort: "DESC",
    });
  });

  it("validates only ASC and DESC and defaults invalid values to DESC", () => {
    expect(validateCreatedAtSort("ASC")).toBe("ASC");
    expect(validateCreatedAtSort("DESC")).toBe("DESC");
    expect(validateCreatedAtSort("ascending")).toBe("DESC");
    expect(validateCreatedAtSort(null)).toBe("DESC");
  });

  it("persists exactly the Pool and Breakdown sort preferences", () => {
    const store = useTriagePreferencesStore.getState();

    store.setPoolCreatedAtSort("ASC");
    store.setBreakdownCreatedAtSort("DESC");

    expect(
      JSON.parse(
        localStorage.getItem(TRIAGE_PREFERENCES_PERSISTENCE_KEY) ?? "null",
      ),
    ).toEqual({
      poolCreatedAtSort: "ASC",
      breakdownCreatedAtSort: "DESC",
      lastSelectedScratchId: null,
    });
  });

  it("changes Pool sort without changing the independent Breakdown sort", () => {
    useTriagePreferencesStore.setState({ breakdownCreatedAtSort: "ASC" });

    useTriagePreferencesStore.getState().setPoolCreatedAtSort("ASC");

    expect(useTriagePreferencesStore.getState()).toMatchObject({
      poolCreatedAtSort: "ASC",
      breakdownCreatedAtSort: "ASC",
    });

    useTriagePreferencesStore.getState().setPoolCreatedAtSort("DESC");

    expect(useTriagePreferencesStore.getState()).toMatchObject({
      poolCreatedAtSort: "DESC",
      breakdownCreatedAtSort: "ASC",
    });
  });

  it("changes Breakdown sort without changing the independent Pool sort", () => {
    useTriagePreferencesStore.setState({ poolCreatedAtSort: "ASC" });

    useTriagePreferencesStore.getState().setBreakdownCreatedAtSort("ASC");

    expect(useTriagePreferencesStore.getState()).toMatchObject({
      poolCreatedAtSort: "ASC",
      breakdownCreatedAtSort: "ASC",
    });

    useTriagePreferencesStore.getState().setBreakdownCreatedAtSort("DESC");

    expect(useTriagePreferencesStore.getState()).toMatchObject({
      poolCreatedAtSort: "ASC",
      breakdownCreatedAtSort: "DESC",
    });
  });

  it("hydrates valid values and defaults invalid values independently", async () => {
    localStorage.setItem(
      TRIAGE_PREFERENCES_PERSISTENCE_KEY,
      JSON.stringify({
        poolCreatedAtSort: "ASC",
        breakdownCreatedAtSort: "invalid",
        candidateIds: ["candidate-1"],
      }),
    );

    await useTriagePreferencesStore.persist.rehydrate();

    expect(useTriagePreferencesStore.getState()).toMatchObject({
      poolCreatedAtSort: "ASC",
      breakdownCreatedAtSort: "DESC",
    });
    expect(
      JSON.parse(
        localStorage.getItem(TRIAGE_PREFERENCES_PERSISTENCE_KEY) ?? "null",
      ),
    ).toEqual({
      poolCreatedAtSort: "ASC",
      breakdownCreatedAtSort: "DESC",
      lastSelectedScratchId: null,
    });
  });

  it("defaults both preferences when persisted JSON is malformed", async () => {
    localStorage.setItem(TRIAGE_PREFERENCES_PERSISTENCE_KEY, "not-json");

    await useTriagePreferencesStore.persist.rehydrate();

    expect(useTriagePreferencesStore.getState()).toMatchObject({
      poolCreatedAtSort: "DESC",
      breakdownCreatedAtSort: "DESC",
    });
  });

  it("exposes no durable, page-session, recovery, or Newly state", () => {
    expect(Object.keys(useTriagePreferencesStore.getState()).sort()).toEqual([
      "breakdownCreatedAtSort",
      "lastSelectedScratchId",
      "poolCreatedAtSort",
      "setBreakdownCreatedAtSort",
      "setLastSelectedScratchId",
      "setPoolCreatedAtSort",
    ]);
  });

  it("defaults the last selected Scratch to null", () => {
    expect(useTriagePreferencesStore.getState().lastSelectedScratchId).toBeNull();
  });

  it("persists the last selected Scratch id in the raw stored value", () => {
    useTriagePreferencesStore.getState().setLastSelectedScratchId("scratch-1");

    expect(
      JSON.parse(
        localStorage.getItem(TRIAGE_PREFERENCES_PERSISTENCE_KEY) ?? "null",
      ),
    ).toEqual({
      poolCreatedAtSort: "DESC",
      breakdownCreatedAtSort: "DESC",
      lastSelectedScratchId: "scratch-1",
    });
  });

  it("rejects an empty or non-string id when setting", () => {
    const store = useTriagePreferencesStore.getState();
    store.setLastSelectedScratchId("scratch-1");

    store.setLastSelectedScratchId("");
    expect(useTriagePreferencesStore.getState().lastSelectedScratchId).toBeNull();

    store.setLastSelectedScratchId("scratch-1");
    store.setLastSelectedScratchId(null);
    expect(useTriagePreferencesStore.getState().lastSelectedScratchId).toBeNull();
  });

  it("hydrates a saved Scratch id and keeps the sorts", async () => {
    localStorage.setItem(
      TRIAGE_PREFERENCES_PERSISTENCE_KEY,
      JSON.stringify({
        poolCreatedAtSort: "ASC",
        breakdownCreatedAtSort: "ASC",
        lastSelectedScratchId: "scratch-9",
      }),
    );

    await useTriagePreferencesStore.persist.rehydrate();

    expect(useTriagePreferencesStore.getState()).toMatchObject({
      poolCreatedAtSort: "ASC",
      breakdownCreatedAtSort: "ASC",
      lastSelectedScratchId: "scratch-9",
    });
  });

  it.each([
    ["a stored value without the field", undefined],
    ["a non-string value", 42],
    ["an empty string", ""],
  ])("loads %s as null", async (_label, value) => {
    localStorage.setItem(
      TRIAGE_PREFERENCES_PERSISTENCE_KEY,
      JSON.stringify({ poolCreatedAtSort: "ASC", lastSelectedScratchId: value }),
    );

    await useTriagePreferencesStore.persist.rehydrate();

    expect(useTriagePreferencesStore.getState().lastSelectedScratchId).toBeNull();
    expect(
      JSON.parse(
        localStorage.getItem(TRIAGE_PREFERENCES_PERSISTENCE_KEY) ?? "null",
      ).lastSelectedScratchId,
    ).toBeNull();
  });
});
