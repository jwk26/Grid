import type { Rejection } from "@/lib/db/snapshot-store";

/**
 * Thrown when a deadline write would violate the parent–child deadline constraint.
 * Consumers can catch this and surface DeadlineConflictModal or DeadlineConflictOverlay.
 */
export class DeadlineConflictError extends Error {
  constructor(
    /** "child_exceeds_parent" — bit/chunk deadline > parent deadline */
    public readonly conflictType: "child_exceeds_parent",
    /** IDs of the conflicting items */
    public readonly conflictingIds: string[],
  ) {
    super("Deadline conflict");
    this.name = "DeadlineConflictError";
  }
}

/** A database function refused the write with a rule code (`rejected` envelope). Nothing was written. */
export class WriteRejectedError extends Error {
  constructor(
    message: string,
    public readonly rejection: Rejection,
  ) {
    super(message);
    this.name = "WriteRejectedError";
  }
}

/**
 * The call got no answer within the request timeout (or the connection failed before a
 * response), so the write may have committed. It is never resent; the snapshot is refetched.
 */
export class WriteOutcomeUnknownError extends Error {
  constructor(message = "The outcome of the write is unknown") {
    super(message);
    this.name = "WriteOutcomeUnknownError";
  }
}
