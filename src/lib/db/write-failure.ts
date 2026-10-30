import { WriteOutcomeUnknownError } from "@/lib/db/write-errors";

// What the store tells the feedback layer about an ordinary write that was rolled back (SPEC
// §Write feel, groups 1 and 2). The store reports it once; the feedback layer owns the sentence.

export type WriteFailureKind =
  | "move"
  | "edit"
  | "deadline"
  | "deadline-extension"
  | "completion"
  | "create"
  | "trash"
  | "archive";

export type WriteFailure = {
  kind: WriteFailureKind;
  /** The title of the item as it was before the write. */
  title: string;
  /** The caller shows a deadline conflict itself: the store leaves that refusal unreported. */
  conflictDialog?: boolean;
  /** Set when the server refused a create for the account limit. */
  accountLimit?: { limit: number; items: string };
};

// The item word of an account-limit refusal, by the table whose limit was reached.
const LIMIT_ITEMS: Record<string, string> = { nodes: "Nodes", bits: "Bits", chunks: "steps" };

export function limitItemsOf(table: string | undefined): string | undefined {
  return table === undefined ? undefined : LIMIT_ITEMS[table];
}

export type ReportWriteFailure = (failure: WriteFailure) => void;

// An error the store has already told the feedback layer about is marked, so a caller that has
// nothing of its own to show drops it instead of ending in an unhandled rejection.
const reported = new WeakSet<object>();

export function markReported<E extends Error>(error: E): E {
  reported.add(error);
  return error;
}

/**
 * For a caller with no message of its own: `write().catch(dropReportedFailure)`. Drops what the
 * store reported, and an unknown outcome whose change is kept (or not known), which has nothing
 * to tell. Anything else, a deadline conflict or a programming error, is thrown again.
 */
export function dropReportedFailure(error: unknown): undefined {
  if (error instanceof WriteOutcomeUnknownError && error.kept !== false) return undefined;
  if (typeof error === "object" && error !== null && reported.has(error)) return undefined;
  throw error;
}
