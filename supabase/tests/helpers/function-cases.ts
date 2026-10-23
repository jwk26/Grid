// The registered test cases of every function in `public` (SCHEMA §Database tests): each
// function needs a cross-account case, and each write function (`security definer`) also a
// change-set case (S14, S31). `coverage.db.test.ts` checks this table against the catalog and
// that each title is a live `it("…")` or `test("…")` in the named file. Add the entry in the
// same task that adds the function.

export type CaseRef = { file: string; title: string };
export type FunctionCases = { crossAccount: CaseRef; changeSet?: CaseRef };

export const FUNCTION_CASES: Record<string, FunctionCases> = {
  ensure_account: {
    crossAccount: {
      file: "ensure-account.db.test.ts",
      title: "leaves another account's rows untouched",
    },
    changeSet: {
      file: "change-set.db.test.ts",
      title: "matches for a first call and for a no-op rerun",
    },
  },
  get_snapshot: {
    crossAccount: {
      file: "snapshot.db.test.ts",
      title: "returns the caller's rows in all five tables and nothing of another account",
    },
  },
};
