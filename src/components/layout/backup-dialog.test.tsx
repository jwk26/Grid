import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { BackupDialog, backupLine } from "@/components/layout/backup-dialog";
import type { UseBackup } from "@/hooks/use-backup";
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
  };
}

function mount(variant: "guest" | "account", b = backup(), c = { signInWithOAuth: vi.fn(async (): Promise<"started" | "failed"> => "started") }) {
  render(<BackupDialog variant={variant} open onOpenChange={vi.fn()} backup={b} controller={c} />);
  return { b, c };
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
    expect(screen.queryByRole("button", { name: /Restore/ })).toBeNull();
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
