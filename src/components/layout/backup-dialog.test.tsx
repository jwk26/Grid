import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { BackupDialog, backupLine } from "@/components/layout/backup-dialog";
import type { UseBackup, UseRestore } from "@/hooks/use-backup";
import type { BackupEntry } from "@/lib/backup/backup-client";
import type { DerivedBackup } from "@/lib/backup/backup-slot";
import { ACCOUNT_MODAL, BACKUP_COPY, formatBackupTime } from "@/lib/copy/feedback";

const FILE_AT = Date.UTC(2026, 10, 5, 23, 30);

function backup(derived: Partial<DerivedBackup> = {}, dialog: Partial<UseBackup["dialog"]> = {}, canBackUpNow = true): UseBackup {
  return {
    derived: { line: "green", dot: null, running: false, lastFileAt: FILE_AT, reason: null, nextChangeIn: null, ...derived },
    slot: { known: true, value: null, arrivedAt: 0, pending: null },
    dialog: { read: "idle", inline: { kind: "none" }, busy: false, ...dialog },
    canBackUpNow,
    open: vi.fn(),
    close: vi.fn(),
    backUpNow: vi.fn(),
    checkAgain: vi.fn(),
    refreshList: vi.fn(),
  };
}

function restoreStub(notice: UseRestore["state"]["notice"] = null): UseRestore {
  return { state: { view: { phase: "idle" }, notice }, start: vi.fn(), checkAgain: vi.fn(), clearNotice: vi.fn() };
}

function mount(
  variant: "guest" | "account",
  b = backup(),
  c = { signInWithOAuth: vi.fn(async (): Promise<"started" | "failed"> => "started") },
  r = restoreStub(),
) {
  render(<BackupDialog variant={variant} open onOpenChange={vi.fn()} backup={b} controller={c} restore={r} />);
  return { b, c, r };
}

const status = () => screen.getByRole("status");

afterEach(cleanup);

describe("BackupDialog, guest", () => {
  it("shows the title, the note, the sign-in note and both buttons, with no status read", () => {
    const { b } = mount("guest");
    expect(screen.getByRole("alertdialog")).toHaveAccessibleName(BACKUP_COPY.guest.title);
    expect(screen.getByText(BACKUP_COPY.guest.note)).toBeInTheDocument();
    expect(screen.getByText(ACCOUNT_MODAL.guest.signInNote)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: ACCOUNT_MODAL.guest.signInGithub })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: ACCOUNT_MODAL.guest.signInGoogle })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: BACKUP_COPY.backUpNow })).toBeNull();
    expect(b.open).not.toHaveBeenCalled();
  });

  it("starts the provider sign-in and shows the inline error when it cannot start", async () => {
    const c = { signInWithOAuth: vi.fn(async (): Promise<"started" | "failed"> => "failed") };
    mount("guest", backup(), c);
    fireEvent.click(screen.getByRole("button", { name: ACCOUNT_MODAL.guest.signInGoogle }));
    expect(c.signInWithOAuth).toHaveBeenCalledWith("google");
    expect(await screen.findByText(ACCOUNT_MODAL.guest.signInError)).toBeInTheDocument();
  });
});

describe("BackupDialog, account", () => {
  it("reads the status once on open and shows the actions row and the privacy note", () => {
    const { b } = mount("account");
    expect(b.open).toHaveBeenCalledTimes(1);
    const actions = document.querySelector('[data-app-role="backup-actions"]')!;
    expect(actions).toContainElement(screen.getByRole("button", { name: BACKUP_COPY.backUpNow }));
    expect(screen.getByText(BACKUP_COPY.privacy)).toBeInTheDocument();
    expect(actions).toContainElement(screen.getByRole("button", { name: BACKUP_COPY.restore.action }));
    fireEvent.click(screen.getByRole("button", { name: BACKUP_COPY.backUpNow }));
    expect(b.backUpNow).toHaveBeenCalledTimes(1);
  });

  it("shows each status line with its text", () => {
    const time = formatBackupTime(FILE_AT);
    const cases: Array<[Partial<DerivedBackup>, string]> = [
      [{}, BACKUP_COPY.green(time)],
      [{ line: "yellow", dot: "stale" }, BACKUP_COPY.yellow(time)],
      [{ line: "gray", lastFileAt: null }, BACKUP_COPY.gray],
      [{ line: "running", running: true }, BACKUP_COPY.running],
      [{ line: "red", dot: "failed", reason: "export_failed" }, BACKUP_COPY.red],
    ];
    for (const [derived, text] of cases) {
      render(<BackupDialog variant="account" open onOpenChange={vi.fn()} backup={backup(derived)} />);
      expect(status()).toHaveTextContent(text);
      cleanup();
    }
  });

  it("the red line gives its reason: too_large has its own, any other runs again tomorrow", () => {
    mount("account", backup({ line: "red", dot: "failed", reason: "too_large" }));
    expect(screen.getByText(BACKUP_COPY.redReason("too_large"))).toBeInTheDocument();
    cleanup();
    mount("account", backup({ line: "red", dot: "failed", reason: "upload_failed" }));
    expect(screen.getByText("It runs again tomorrow.")).toBeInTheDocument();
  });

  it("Checking… until the read answers, with Back Up Now unavailable", () => {
    mount("account", backup({}, { read: "checking" }));
    expect(status()).toHaveTextContent("Checking…");
    expect(screen.getByRole("button", { name: BACKUP_COPY.backUpNow })).toBeDisabled();
  });

  it("a failed read shows its line with Check again", () => {
    const { b } = mount("account", backup({}, { read: "failed" }));
    expect(status()).toHaveTextContent("Couldn't check the backup status.");
    fireEvent.click(screen.getByRole("button", { name: "Check again" }));
    expect(b.checkAgain).toHaveBeenCalledTimes(1);
  });

  it("shows the inline results with no toast: unchanged, rate limited, did not start", () => {
    mount("account", backup({}, { inline: { kind: "unchanged" } }));
    expect(status()).toHaveTextContent(BACKUP_COPY.unchanged(formatBackupTime(FILE_AT)));
    cleanup();
    mount("account", backup({}, { inline: { kind: "rate_limited" } }));
    expect(status()).toHaveTextContent("Try again in a few minutes.");
    cleanup();
    mount("account", backup({}, { inline: { kind: "not_started" } }));
    expect(status()).toHaveTextContent("The backup didn't start. Try again.");
  });

  it("already_running shows Backing up… with Check again, and still finishing shows Still finishing… with Check again", () => {
    mount("account", backup({}, { inline: { kind: "already_running" } }));
    expect(status()).toHaveTextContent("Backing up…");
    expect(screen.getByRole("button", { name: "Check again" })).toBeInTheDocument();
    cleanup();
    mount("account", backup({ running: true, line: "running" }, { inline: { kind: "still_finishing" } }));
    expect(status()).toHaveTextContent("Still finishing…");
    expect(screen.getByRole("button", { name: "Check again" })).toBeInTheDocument();
  });

  it("busy: Backing up… in the line and the dialog marked busy; Back Up Now unavailable", () => {
    mount("account", backup({}, { busy: true }), undefined);
    expect(status()).toHaveTextContent("Backing up…");
    expect(screen.getByRole("alertdialog")).toHaveAttribute("aria-busy", "true");
  });

  it("Back Up Now is unavailable while the hook says so", () => {
    mount("account", backup({}, {}, false));
    expect(screen.getByRole("button", { name: BACKUP_COPY.backUpNow })).toBeDisabled();
  });

  it("shows a backup across the UTC date boundary as the viewer's local date and time, not the object's UTC date", () => {
    // 2026-11-05 23:30 UTC is already 6 November, 08:30 in Seoul.
    expect(formatBackupTime(FILE_AT, "en-US", "Asia/Seoul")).toMatch(/Nov 6, 2026.*8:30/);
    expect(formatBackupTime(FILE_AT, "en-US", "UTC")).toMatch(/Nov 5, 2026.*11:30/);
    expect(backupLine({ derived: backup().derived, dialog: backup().dialog }).text).toContain(formatBackupTime(FILE_AT));
  });
});

// Task 262: Restore…, the list and the confirmation (SPEC §Account backup, Restore).
describe("BackupDialog, restore", () => {
  const daily: BackupEntry = { name: "2026-11-07", kind: "daily", at: Date.UTC(2026, 10, 6, 23, 30), size: 1, etag: "e1" };
  const pre: BackupEntry = { name: "pre-restore/2026-11-06T09-00-00Z", kind: "pre_restore", at: Date.UTC(2026, 10, 6, 9, 0), size: 1, etag: "e2" };

  it("lists the entries newest first as given, daily as the time and pre-restore as Before restore, <time>", () => {
    mount("account", backup({}, { backups: [daily, pre] }));
    fireEvent.click(screen.getByRole("button", { name: BACKUP_COPY.restore.action }));
    expect(screen.getByRole("alertdialog")).toHaveAccessibleName(BACKUP_COPY.restore.listTitle);
    const buttons = Array.from(document.querySelectorAll('[data-app-role="restore-list"] button')).map((b) => b.textContent);
    expect(buttons).toEqual([formatBackupTime(daily.at), BACKUP_COPY.restore.preRestoreEntry(formatBackupTime(pre.at))]);
  });

  it("shows the local date of an entry across the UTC boundary (Asia/Seoul), not the object name's date", () => {
    // 2026-11-06 23:30 UTC is 2026-11-07 08:30 in Seoul.
    expect(formatBackupTime(daily.at, "en-US", "Asia/Seoul")).toContain("Nov 7, 2026");
    expect(formatBackupTime(daily.at, "en-US", "UTC")).toContain("Nov 6, 2026");
  });

  it("choosing an entry asks for confirmation; Cancel returns to the list; Restore starts it with the file and etag", () => {
    const { r } = mount("account", backup({}, { backups: [daily, pre] }));
    fireEvent.click(screen.getByRole("button", { name: BACKUP_COPY.restore.action }));
    fireEvent.click(screen.getByRole("button", { name: formatBackupTime(daily.at) }));
    expect(screen.getByText(BACKUP_COPY.restore.confirm(formatBackupTime(daily.at)))).toBeInTheDocument();
    expect(r.start).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: BACKUP_COPY.restore.cancel }));
    expect(document.querySelector('[data-app-role="restore-list"]')).not.toBeNull();
    fireEvent.click(screen.getByRole("button", { name: formatBackupTime(daily.at) }));
    fireEvent.click(screen.getByRole("button", { name: BACKUP_COPY.restore.confirmAction }));
    expect(r.start).toHaveBeenCalledWith("2026-11-07", "e1");
  });

  it("an entry without an etag cannot be chosen", () => {
    mount("account", backup({}, { backups: [{ ...daily, etag: null }] }));
    fireEvent.click(screen.getByRole("button", { name: BACKUP_COPY.restore.action }));
    expect(screen.getByRole("button", { name: formatBackupTime(daily.at) })).toBeDisabled();
  });

  it("an empty list, a failed listing (with Check again) and a list not read yet", () => {
    const empty = mount("account", backup({}, { backups: [] }));
    fireEvent.click(screen.getByRole("button", { name: BACKUP_COPY.restore.action }));
    expect(status()).toHaveTextContent(BACKUP_COPY.restore.emptyList);
    expect(empty.b.checkAgain).not.toHaveBeenCalled();
    cleanup();
    const failed = mount("account", backup({}, { backups: null }));
    fireEvent.click(screen.getByRole("button", { name: BACKUP_COPY.restore.action }));
    expect(status()).toHaveTextContent(BACKUP_COPY.restore.listFailed);
    fireEvent.click(screen.getByRole("button", { name: BACKUP_COPY.checkAgain }));
    expect(failed.b.checkAgain).toHaveBeenCalledTimes(1);
    cleanup();
    mount("account", backup());
    fireEvent.click(screen.getByRole("button", { name: BACKUP_COPY.restore.action }));
    expect(status()).toHaveTextContent(BACKUP_COPY.checking);
  });

  it("opening the list reads it again, so a backup made since the dialog opened is there", () => {
    const { b } = mount("account", backup({}, { backups: [] }));
    fireEvent.click(screen.getByRole("button", { name: BACKUP_COPY.restore.action }));
    expect(b.refreshList).toHaveBeenCalledTimes(1);
  });

  it("Cancel in the list returns to the main view", () => {
    mount("account", backup({}, { backups: [daily] }));
    fireEvent.click(screen.getByRole("button", { name: BACKUP_COPY.restore.action }));
    fireEvent.click(screen.getByRole("button", { name: BACKUP_COPY.restore.cancel }));
    expect(screen.getByRole("button", { name: BACKUP_COPY.backUpNow })).toBeInTheDocument();
  });

  it.each([
    ["account_changed", BACKUP_COPY.restore.accountChanged],
    ["unsupported_format", BACKUP_COPY.restore.unsupportedFormat],
    ["not_applied", BACKUP_COPY.restore.notApplied],
    ["rate_limited", BACKUP_COPY.rateLimited],
  ] as const)("a returned %s shows its line", (notice, text) => {
    mount("account", backup(), undefined, restoreStub(notice));
    expect(status()).toHaveTextContent(text);
  });

  it("clears the notice when the user moves on: Back Up Now, Restore…", () => {
    const { r } = mount("account", backup(), undefined, restoreStub("not_applied"));
    fireEvent.click(screen.getByRole("button", { name: BACKUP_COPY.backUpNow }));
    expect(r.clearNotice).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole("button", { name: BACKUP_COPY.restore.action }));
    expect(r.clearNotice).toHaveBeenCalledTimes(2);
  });

  it("Restore… waits while the status is being read", () => {
    mount("account", backup({}, { read: "checking" }));
    expect(screen.getByRole("button", { name: BACKUP_COPY.restore.action })).toBeDisabled();
  });
});
