// The restore stream's wire format (SCHEMA §Account backup, Restore): `text/event-stream`, each
// event `event: <name>` and one `data:` line of JSON. Pure.

export type RestoreStep = "saving" | "getting" | "applying";

/** The result vocabulary of the SQL envelope plus `unconfirmed` (the client reads the verdict). */
export type RestoreResult =
  | { status: "applied" }
  | { status: "not_applied"; reason?: string }
  | { status: "rejected"; rejection: { code: string } }
  | { status: "unconfirmed" };

export type RestoreEvent = { type: "step"; step: RestoreStep } | { type: "result"; result: RestoreResult };

export function formatEvent(e: RestoreEvent): string {
  return e.type === "step"
    ? `event: step\ndata: ${JSON.stringify({ step: e.step })}\n\n`
    : `event: result\ndata: ${JSON.stringify(e.result)}\n\n`;
}
