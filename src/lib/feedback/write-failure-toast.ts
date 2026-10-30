import { toastCopy } from "@/lib/copy/feedback";
import type { WriteFailure } from "@/lib/db/write-failure";
import { showToast } from "@/lib/feedback/toast";

/**
 * The toast for an ordinary write the store rolled back (SPEC §Toasts, Use (1); §Feedback copy).
 * The store calls it once per write, so no caller raises the same toast again.
 */
export function reportWriteFailure(failure: WriteFailure): void {
  const { kind, title, accountLimit } = failure;
  if (accountLimit) {
    showToast(toastCopy.accountLimit, title, accountLimit.limit, accountLimit.items);
    return;
  }
  switch (kind) {
    case "move":
      return showToast(toastCopy.rolledBackMove, title);
    case "edit":
      return showToast(toastCopy.rolledBackEdit, title);
    case "deadline":
      return showToast(toastCopy.rolledBackDeadline, title);
    case "deadline-extension":
      return showToast(toastCopy.rolledBackDeadlineExtension);
    case "completion":
      return showToast(toastCopy.rolledBackCompletion, title);
    case "create":
      return showToast(toastCopy.rolledBackCreate, title);
    case "trash":
      return showToast(toastCopy.rolledBackTrash, title);
    case "archive":
      return showToast(toastCopy.rolledBackArchive, title);
  }
}
