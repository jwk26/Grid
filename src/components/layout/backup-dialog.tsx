"use client";

import { CloudUpload } from "lucide-react";
import { useEffect, useState } from "react";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import type { UseBackup } from "@/hooks/use-backup";
import { getSessionController, type SessionController } from "@/lib/auth/session";
import { ACCOUNT_MODAL, BACKUP_BUTTON_LABEL, BACKUP_COPY, formatBackupTime } from "@/lib/copy/feedback";
import { cn } from "@/lib/utils";

// The guest and account backup dialog (SPEC §Account backup; DESIGN_TOKENS BK-4, BK-5). It wears
// the account modal's frame (the Scratch Trash dialog card), so every theme restyles it through
// the shared dialog classes and no theme id branches here.

type Tone = "success" | "warning" | "error" | "neutral" | "running";

const LAMP_TONE: Record<Tone, string> = {
  success: "bg-[hsl(var(--status-success))]",
  warning: "bg-[hsl(var(--status-warning))]",
  error: "bg-[hsl(var(--status-error))]",
  neutral: "bg-[hsl(var(--status-item))]",
  running: "bg-primary backup-lamp--running",
};

type Line = { tone: Tone; text: string; detail?: string; checkAgain?: boolean };

/** What the status line says, by the dialog's state first and then the account's. Pure. */
export function backupLine(backup: Pick<UseBackup, "derived" | "dialog">): Line {
  const { derived, dialog } = backup;
  if (dialog.read === "checking") return { tone: "running", text: BACKUP_COPY.checking };
  if (dialog.read === "failed") return { tone: "error", text: BACKUP_COPY.readFailed, checkAgain: true };
  if (dialog.busy) return { tone: "running", text: BACKUP_COPY.running };
  const time = derived.lastFileAt === null ? "" : formatBackupTime(derived.lastFileAt);
  switch (dialog.inline.kind) {
    case "still_finishing":
      return { tone: "running", text: BACKUP_COPY.stillFinishing, checkAgain: true };
    case "already_running":
      return { tone: "running", text: BACKUP_COPY.running, checkAgain: true };
    case "rate_limited":
      return { tone: "neutral", text: BACKUP_COPY.rateLimited };
    case "not_started":
      return { tone: "warning", text: BACKUP_COPY.notStarted };
    case "unchanged":
      return { tone: "success", text: BACKUP_COPY.unchanged(time) };
    case "failed":
      return { tone: "error", text: BACKUP_COPY.red, detail: BACKUP_COPY.redReason(dialog.inline.reason) };
    default:
      break;
  }
  switch (derived.line) {
    case "running":
      return { tone: "running", text: BACKUP_COPY.running };
    case "red":
      return { tone: "error", text: BACKUP_COPY.red, detail: BACKUP_COPY.redReason(derived.reason) };
    case "yellow":
      return { tone: "warning", text: BACKUP_COPY.yellow(time) };
    case "green":
      return { tone: "success", text: BACKUP_COPY.green(time) };
    case "gray":
      return { tone: "neutral", text: BACKUP_COPY.gray };
  }
}

type SignIn = Pick<SessionController, "signInWithOAuth">;

type BackupDialogProps = {
  variant: "guest" | "account";
  open: boolean;
  onOpenChange: (open: boolean) => void;
  backup: UseBackup;
  /** Tests inject a controller; the app uses the shared one. */
  controller?: SignIn;
};

export function BackupDialog({ variant, open, onOpenChange, backup, controller: injected }: BackupDialogProps) {
  const [startFailed, setStartFailed] = useState(false);
  const account = variant === "account";

  // The account dialog reads the status once when it opens; closing it stops no run.
  const { open: readStatus, close: stopReading } = backup;
  useEffect(() => {
    if (!open || !account) return;
    readStatus();
    return stopReading;
  }, [open, account, readStatus, stopReading]);

  async function signIn(provider: "github" | "google") {
    setStartFailed(false);
    const controller: SignIn = injected ?? getSessionController();
    if ((await controller.signInWithOAuth(provider)) === "failed") setStartFailed(true);
  }

  const line = account ? backupLine(backup) : null;
  const busy = backup.dialog.busy;

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        if (!next) setStartFailed(false);
        onOpenChange(next);
      }}
    >
      <AlertDialogContent
        aria-busy={busy ? "true" : undefined}
        {...(account ? { "aria-describedby": undefined } : {})}
        className="scratch-trash-dialog"
        data-app-role="backup-dialog"
        data-variant={variant}
        overlayClassName="scratch-trash-dialog-overlay"
      >
        <span aria-hidden="true" className="scratch-trash-dialog__mark">
          <CloudUpload className="h-5 w-5" />
        </span>
        <div className="scratch-trash-dialog__content grid gap-4">
          {account && line ? (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle>{BACKUP_BUTTON_LABEL}</AlertDialogTitle>
              </AlertDialogHeader>
              <div className="grid gap-1">
                <p
                  aria-live="polite"
                  className="scratch-trash-dialog__state grid min-h-5 gap-0.5 text-sm font-medium"
                  data-backup-tone={line.tone}
                  role="status"
                >
                  <span className="flex items-center gap-2">
                    <span
                      aria-hidden="true"
                      className={cn("backup-lamp inline-block h-2 w-2 shrink-0 rounded-full", LAMP_TONE[line.tone])}
                      data-app-role="backup-lamp"
                    />
                    <span>{line.text}</span>
                  </span>
                  {line.detail ? <span className="pl-4 font-normal">{line.detail}</span> : null}
                </p>
                {line.checkAgain ? (
                  <div className="pl-4">
                    <Button size="sm" type="button" variant="outline" onClick={backup.checkAgain} disabled={busy}>
                      {BACKUP_COPY.checkAgain}
                    </Button>
                  </div>
                ) : null}
              </div>
              <div className="flex items-center justify-end gap-2 border-t pt-4" data-app-role="backup-actions">
                <Button
                  disabled={!backup.canBackUpNow || backup.dialog.read === "checking"}
                  type="button"
                  variant="default"
                  onClick={backup.backUpNow}
                >
                  {BACKUP_COPY.backUpNow}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground" style={{ lineHeight: 1.5 }}>
                {BACKUP_COPY.privacy}
              </p>
              <AlertDialogFooter>
                <AlertDialogCancel>{BACKUP_COPY.close}</AlertDialogCancel>
              </AlertDialogFooter>
            </>
          ) : (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle>{BACKUP_COPY.guest.title}</AlertDialogTitle>
                <AlertDialogDescription asChild>
                  <div className="grid gap-1.5">
                    <p>{BACKUP_COPY.guest.note}</p>
                    <p>{ACCOUNT_MODAL.guest.signInNote}</p>
                  </div>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <p aria-live="polite" className="scratch-trash-dialog__state min-h-5 text-sm font-medium" role="status">
                {startFailed ? ACCOUNT_MODAL.guest.signInError : ""}
              </p>
              <div className="flex flex-wrap items-center gap-2 border-t pt-4">
                <Button type="button" variant="outline" onClick={() => void signIn("github")}>
                  {ACCOUNT_MODAL.guest.signInGithub}
                </Button>
                <Button type="button" variant="outline" onClick={() => void signIn("google")}>
                  {ACCOUNT_MODAL.guest.signInGoogle}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground" style={{ lineHeight: 1.5 }}>
                {ACCOUNT_MODAL.privacy}
              </p>
              <AlertDialogFooter>
                <AlertDialogCancel>{BACKUP_COPY.close}</AlertDialogCancel>
              </AlertDialogFooter>
            </>
          )}
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}
