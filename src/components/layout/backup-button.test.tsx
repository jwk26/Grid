import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";
import { BackupButton } from "@/components/layout/backup-button";
import type { UseBackup } from "@/hooks/use-backup";
import type { DerivedBackup } from "@/lib/backup/backup-slot";

function backup(derived: Partial<DerivedBackup> = {}, dialog: Partial<UseBackup["dialog"]> = {}): UseBackup {
  return {
    derived: { line: "green", dot: null, running: false, lastFileAt: 1_700_000_000_000, reason: null, nextChangeIn: null, ...derived },
    slot: { known: true, value: null, arrivedAt: 0, pending: null },
    dialog: { read: "idle", inline: { kind: "none" }, busy: false, ...dialog },
    canBackUpNow: true,
    open: vi.fn(),
    close: vi.fn(),
    backUpNow: vi.fn(),
    checkAgain: vi.fn(),
  };
}

afterEach(cleanup);

describe("BackupButton", () => {
  it("is named Backup, with the same classes as the account button's neighbours and no dot when backed up", () => {
    render(<BackupButton variant="account" backup={backup()} />);
    const button = screen.getByRole("button", { name: "Backup" });
    expect(button).toHaveAttribute("data-app-role", "backup-button");
    expect(button).toHaveAttribute("title", "Backup");
    expect(button.className).toContain("h-10 w-10");
    expect(document.querySelector('[data-app-role="backup-dot"]')).toBeNull();
    expect(button).not.toHaveAttribute("data-backup-motion");
  });

  it.each([
    ["stale", "yellow"],
    ["failed", "red"],
  ] as const)("shows the %s dot only for that state", (dot, line) => {
    render(<BackupButton variant="account" backup={backup({ dot, line })} />);
    expect(document.querySelector('[data-app-role="backup-dot"]')).toHaveAttribute("data-backup-state", dot);
  });

  it("runs the motion while a run is in progress, and a dot wins over it", () => {
    const { rerender } = render(<BackupButton variant="account" backup={backup({ running: true, line: "running" })} />);
    const button = screen.getByRole("button", { name: "Backup" });
    expect(button).toHaveAttribute("data-backup-motion", "running");
    // The still reduced-motion dot is in the DOM, hidden until prefers-reduced-motion.
    expect(document.querySelector('[data-backup-state="running"]')).toHaveClass("backup-running-dot");
    rerender(<BackupButton variant="account" backup={backup({ running: true, line: "running", dot: "failed" })} />);
    expect(button).not.toHaveAttribute("data-backup-motion");
    expect(document.querySelector('[data-backup-state="running"]')).toBeNull();
    expect(document.querySelector('[data-backup-state="failed"]')).not.toBeNull();
  });

  it("a guest has no dot and no motion", () => {
    render(<BackupButton variant="guest" backup={backup({ running: true, dot: "failed" })} />);
    expect(document.querySelector('[data-app-role="backup-dot"]')).toBeNull();
    expect(screen.getByRole("button", { name: "Backup" })).not.toHaveAttribute("data-backup-motion");
  });

  it("opens the dialog; the account variant reads the status once", () => {
    const b = backup();
    render(<BackupButton variant="account" backup={b} />);
    fireEvent.click(screen.getByRole("button", { name: "Backup" }));
    expect(screen.getByRole("alertdialog")).toHaveAttribute("data-app-role", "backup-dialog");
    expect(b.open).toHaveBeenCalledTimes(1);
  });

  it("the arrow motion moves the 1st and 3rd paths of cloud-upload and never the cloud (2nd)", () => {
    render(<BackupButton variant="account" backup={backup()} />);
    expect(document.querySelectorAll('[data-app-role="backup-button"] svg path')).toHaveLength(3);
    const css = readFileSync("src/app/globals.css", "utf8");
    const rules = css.slice(css.indexOf("Backup button and dialog (Task 258"));
    expect(rules).toContain("path:nth-child(1)");
    expect(rules).toContain("path:nth-child(3)");
    expect(rules).not.toContain("path:nth-child(2)");
    expect(rules).toMatch(/animation: backup-arrow-rise 1\.5s ease-in-out infinite/);
    expect(rules).toMatch(/prefers-reduced-motion: reduce[\s\S]*animation: none/);
  });
});
