import { createDialogAccountLimit, createDialogFailed } from "@/lib/copy/feedback";
import { WriteOutcomeUnknownError, WriteRejectedError } from "@/lib/db/write-errors";
import { limitItemsOf } from "@/lib/db/write-failure";

export type CreateRefusal =
  | { outcome: "kept" }
  | { outcome: "line"; text: string }
  | { outcome: "other"; error: unknown };

/**
 * What a create dialog does with a failed create (SPEC §Feedback copy, Dialogs and shell). The
 * dialog passes `report: false` to the store, shows its inline line, keeps the typed title and
 * raises no toast. An unknown outcome shows the line only if the refetch rolled the create back;
 * a kept create closes the dialog like a success.
 */
export function classifyCreateRefusal(error: unknown, title: string): CreateRefusal {
  if (error instanceof WriteOutcomeUnknownError) {
    return error.kept === true ? { outcome: "kept" } : { outcome: "line", text: createDialogFailed(title) };
  }
  if (error instanceof WriteRejectedError) {
    const { code, table, limit } = error.rejection;
    const items = limitItemsOf(table);
    if (code === "account_limit" && limit !== undefined && items) {
      return { outcome: "line", text: createDialogAccountLimit(limit, items) };
    }
    return { outcome: "line", text: createDialogFailed(title) };
  }
  return { outcome: "other", error };
}
