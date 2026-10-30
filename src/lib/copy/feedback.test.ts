import { describe, expect, it } from "vitest";
import { createDialogNoEmptyCell, toastCopy } from "./feedback";

describe("createDialogNoEmptyCell", () => {
  it("names the target Node in the SPEC create-dialog sentence", () => {
    expect(createDialogNoEmptyCell("Roadmap")).toBe(
      "“Roadmap” has no empty cell. Move or delete an item to make room.",
    );
  });

  it("names Home for a Node created at L0", () => {
    expect(createDialogNoEmptyCell("Home")).toBe(
      "“Home” has no empty cell. Move or delete an item to make room.",
    );
  });
});

describe("toastCopy", () => {
  it("states each SPEC single sentence", () => {
    expect(toastCopy.rolledBackMove.single("A")).toBe("Couldn't move “A”. It's back where it was.");
    expect(toastCopy.rolledBackEdit.single("A")).toBe(
      "Couldn't save the change to “A”. The saved version is back.",
    );
    expect(toastCopy.rolledBackDeadline.single("A")).toBe(
      "Couldn't change the deadline of “A”. The previous one is back.",
    );
    expect(toastCopy.rolledBackDeadlineExtension.single()).toBe(
      "Couldn't change the deadlines. The previous ones are back.",
    );
    expect(toastCopy.rolledBackCompletion.single("A")).toBe("Couldn't update “A”. It's back as it was.");
    expect(toastCopy.rolledBackCreate.single("A")).toBe("Couldn't create “A”. It was removed.");
    expect(toastCopy.rolledBackTrash.single("A")).toBe("Couldn't move “A” to Trash. It's back in place.");
    expect(toastCopy.rolledBackArchive.single("A")).toBe("Couldn't archive “A”. It's back in place.");
    expect(toastCopy.accountLimit.single("A", 100, "Nodes")).toBe(
      "Couldn't create “A”. This account has reached its limit of 100 Nodes.",
    );
    expect(toastCopy.offlineWrite.single()).toBe("You're offline. Changes can't be saved right now.");
    expect(toastCopy.targetGridFull.single("A", "B")).toBe("Couldn't move “A”. “B” has no empty cell.");
    expect(toastCopy.moveIntoDescendant.single("A")).toBe("Couldn't move “A” into a Node inside it.");
    expect(toastCopy.homeFull.single("A")).toBe("Couldn't show “A” on Home. Home has no empty cell.");
    expect(toastCopy.restoreSucceeded.single("A")).toBe("Restored “A”.");
    expect(toastCopy.restoreBlocked.single("A")).toBe("Couldn't restore “A”. Its Grid has no empty cell.");
    expect(toastCopy.restoreFailed.single("A")).toBe("Couldn't restore “A”. It's still in Trash.");
    expect(toastCopy.permanentDeleteSucceeded.single("A")).toBe("Deleted “A” permanently.");
    expect(toastCopy.permanentDeleteFailed.single("A")).toBe("Couldn't delete “A”. It's still in Trash.");
    expect(toastCopy.emptyTrashSucceeded.single()).toBe("Trash emptied.");
    expect(toastCopy.emptyTrashFailed.single()).toBe("Couldn't empty Trash. Nothing was deleted.");
    expect(toastCopy.promoteFailed.single("A")).toBe("Couldn't promote “A”. It's still a Bit.");
    expect(toastCopy.stepDeleteFailed.single("A")).toBe("Couldn't delete “A”. It's still there.");
    expect(toastCopy.archiveRestoreFailed.single("A")).toBe("Couldn't restore “A”. It's still in Archive.");
    expect(toastCopy.accountDeleted.single()).toBe("Your account and its data were deleted.");
    expect(toastCopy.accountDeletionScheduled.single()).toBe(
      "Your account will be deleted within 24 hours.",
    );
  });

  it("states each SPEC counted sentence", () => {
    expect(toastCopy.rolledBackMove.counted(3)).toBe("Couldn't save 3 changes. They were put back.");
    expect(toastCopy.accountLimit.counted(3)).toBe(
      "Couldn't create 3 items. This account has reached its limit.",
    );
    expect(toastCopy.offlineWrite.counted(3)).toBe("You're offline. 3 changes weren't saved.");
    expect(toastCopy.targetGridFull.counted(3)).toBe(
      "Couldn't move 3 items. Their target has no empty cell.",
    );
    expect(toastCopy.restoreSucceeded.counted(3)).toBe("Restored 3 items.");
    expect(toastCopy.permanentDeleteSucceeded.counted(3)).toBe("Deleted 3 items permanently.");
  });

  it("shares one key across the rolled-back rows and gives every other row its own", () => {
    const rolledBack = Object.entries(toastCopy).filter(([name]) => name.startsWith("rolledBack"));
    expect(new Set(rolledBack.map(([, row]) => row.key)).size).toBe(1);

    const others = Object.entries(toastCopy).filter(([name]) => !name.startsWith("rolledBack"));
    const keys = others.map(([, row]) => row.key);
    // The two account-deleted sentences are one kind.
    expect(new Set(keys).size).toBe(keys.length - 1);
    expect(keys).not.toContain(rolledBack[0][1].key);
  });

  it("keeps one tone with each key", () => {
    const toneByKey = new Map<string, string>();
    for (const row of Object.values(toastCopy)) {
      expect(toneByKey.get(row.key) ?? row.tone).toBe(row.tone);
      toneByKey.set(row.key, row.tone);
    }
    expect(toastCopy.restoreSucceeded.tone).toBe("success");
    expect(toastCopy.offlineWrite.tone).toBe("warning");
    expect(toastCopy.rolledBackMove.tone).toBe("failure");
  });
});
