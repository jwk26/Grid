// The function's own answers. Statuses 500, 502, 503, 504 and 546 are what the platform returns
// when a function is killed at a limit (Task 255 measurement), so the client treats them as "no
// answer" and reads the run's verdict instead. The function therefore never uses them for its own
// failure answers, except the one deliberate case below.

export const NO_ANSWER_STATUSES: readonly number[] = [500, 502, 503, 504, 546];

/** A finish the database did not confirm: the client must read the verdict, so it is a no-answer status. */
export const UNCONFIRMED_STATUS = 502;

export type Rejection = { code: string };

export function isNoAnswerStatus(status: number): boolean {
  return NO_ANSWER_STATUSES.includes(status);
}

/** Protocol and auth refusals: 400 body, 401 secret or JWT, 403 guest, 405 method. */
export const REFUSAL_STATUSES = [400, 401, 403, 405] as const;
export type RefusalStatus = (typeof REFUSAL_STATUSES)[number];

export function refusalBody(code: string): { status: "refused"; code: string } {
  return { status: "refused", code };
}

/** A domain refusal answers 200 with the envelope the SQL functions use. */
export function rejectedBody(code: string): { status: "rejected"; rejection: Rejection } {
  return { status: "rejected", rejection: { code } };
}

/** Throws when a status of the function's own would read as no-answer (except the unconfirmed case). */
export function assertOwnStatus(status: number): number {
  if (isNoAnswerStatus(status) && status !== UNCONFIRMED_STATUS) {
    throw new Error(`status ${status} is reserved for a platform no-answer`);
  }
  return status;
}
