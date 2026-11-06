// Errors whose message is a fixed code, so a log line never carries a URL, a key or a database
// message. Anything else is logged by its constructor name only.

export class SafeError extends Error {
  readonly code: string;
  constructor(code: string) {
    super(code);
    this.name = "SafeError";
    this.code = code;
  }
}

/** The text a log line may carry for any thrown value. */
export function logCode(error: unknown): string {
  if (error instanceof SafeError) return error.code;
  if (error instanceof Error) return error.name;
  return "non_error";
}
