"use client";

import { CloudUpload } from "lucide-react";
import { useState } from "react";
import { BackupDialog } from "@/components/layout/backup-dialog";
import { SidebarIconButton } from "@/components/layout/sidebar-icon-button";
import { useBackup, useRestore, type UseBackup } from "@/hooks/use-backup";
import { BACKUP_BUTTON_LABEL } from "@/lib/copy/feedback";
import { cn } from "@/lib/utils";

// The sidebar Backup button (SPEC §Account backup; DESIGN_TOKENS BK-1 to BK-3): right below the
// account icon on every route. A guest has no dot and no motion: nothing of theirs is backed up.

export function BackupButton({ variant, backup: injected }: { variant: "guest" | "account"; backup?: UseBackup }) {
  const real = useBackup();
  const backup = injected ?? real;
  const restore = useRestore();
  const [open, setOpen] = useState(false);
  const account = variant === "account";
  const dot = account ? backup.derived.dot : null;
  // A yellow or red dot wins over the motion.
  const running = account && backup.derived.running && dot === null;

  return (
    <>
      <SidebarIconButton
        aria-haspopup="dialog"
        data-app-role="backup-button"
        data-backup-motion={running ? "running" : undefined}
        icon={CloudUpload}
        label={BACKUP_BUTTON_LABEL}
        onClick={() => setOpen(true)}
      >
        {dot ? (
          <span
            aria-hidden="true"
            className={cn(
              "absolute right-1.5 top-1.5 h-2.5 w-2.5 rounded-full ring-2 ring-background",
              dot === "failed" ? "bg-[hsl(var(--status-error))]" : "bg-[hsl(var(--status-warning))]",
            )}
            data-app-role="backup-dot"
            data-backup-state={dot}
          />
        ) : running ? (
          // Shown only under prefers-reduced-motion, where the arrow loop stops (globals.css).
          <span
            aria-hidden="true"
            className="backup-running-dot absolute right-1.5 top-1.5 hidden h-2.5 w-2.5 rounded-full bg-primary ring-2 ring-background"
            data-app-role="backup-dot"
            data-backup-state="running"
          />
        ) : null}
      </SidebarIconButton>
      {/* The dialog steps aside while the restoring screen covers the app, and returns with the reason. */}
      <BackupDialog
        backup={backup}
        open={open && restore.state.view.phase === "idle"}
        restore={restore}
        variant={variant}
        onOpenChange={setOpen}
      />
    </>
  );
}
