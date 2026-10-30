import { beforeEach, describe, expect, it, vi } from "vitest";
import { toastCopy } from "@/lib/copy/feedback";

const showToast = vi.hoisted(() => vi.fn());
vi.mock("@/lib/feedback/toast", () => ({ showToast }));

import { reportWriteFailure } from "./write-failure-toast";

beforeEach(() => showToast.mockClear());

describe("reportWriteFailure", () => {
  it.each([
    ["move", toastCopy.rolledBackMove],
    ["edit", toastCopy.rolledBackEdit],
    ["deadline", toastCopy.rolledBackDeadline],
    ["completion", toastCopy.rolledBackCompletion],
    ["create", toastCopy.rolledBackCreate],
    ["trash", toastCopy.rolledBackTrash],
    ["archive", toastCopy.rolledBackArchive],
  ] as const)("shows the %s row with the title", (kind, row) => {
    reportWriteFailure({ kind, title: "A" });
    expect(showToast).toHaveBeenCalledWith(row, "A");
  });

  it("shows the deadline extension row without a title", () => {
    reportWriteFailure({ kind: "deadline-extension", title: "A" });
    expect(showToast).toHaveBeenCalledWith(toastCopy.rolledBackDeadlineExtension);
  });

  it("shows the account-limit row for a refused create", () => {
    reportWriteFailure({ kind: "create", title: "A", accountLimit: { limit: 100, items: "Nodes" } });
    expect(showToast).toHaveBeenCalledWith(toastCopy.accountLimit, "A", 100, "Nodes");
  });
});
