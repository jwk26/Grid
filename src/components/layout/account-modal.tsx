"use client";

import { TriangleAlert, UserRound } from "lucide-react";
import { useEffect, useRef, useState } from "react";
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
import { getSessionController, type SessionController } from "@/lib/auth/session";
import { ACCOUNT_BUTTON_LABEL, ACCOUNT_MODAL, toastCopy } from "@/lib/copy/feedback";
import { showToast } from "@/lib/feedback/toast";

// The guest and account modal (SPEC §Account icon and modal; DESIGN_TOKENS SA-6). It wears the
// Scratch Trash dialog frame, so every theme restyles it through the shared dialog classes and no
// theme id branches here. `signInError` is the inline line of a sign-in that did not complete.

type ModalController = Pick<SessionController, "signOut" | "requestAccountDeletion" | "getAccountName" | "signInWithOAuth">;

type AccountModalProps = {
  variant: "guest" | "account";
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The inline error of a sign-in that did not complete (a problem inside a dialog, F11). */
  signInError?: string | null;
  /** Tests inject a controller; the app uses the shared one. */
  controller?: ModalController;
};

type Step = "account" | "confirm";

export function AccountModal({ variant, open, onOpenChange, signInError = null, controller: injected }: AccountModalProps) {
  const controller: ModalController = injected ?? getSessionController();
  const [step, setStep] = useState<Step>("account");
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);
  const [startFailed, setStartFailed] = useState(false);

  const confirming = variant === "account" && step === "confirm";

  // A step change unmounts the focused button, which would drop focus on the dialog itself. The
  // confirmation starts on Cancel (the safe action); going back returns to Delete account.
  const contentRef = useRef<HTMLDivElement>(null);
  const previousStep = useRef<Step>(step);
  useEffect(() => {
    if (previousStep.current === step) return;
    previousStep.current = step;
    const label = step === "confirm" ? ACCOUNT_MODAL.confirm.cancel : ACCOUNT_MODAL.account.deleteAccount;
    for (const button of contentRef.current?.querySelectorAll("button") ?? []) {
      if (button.textContent === label) {
        button.focus();
        break;
      }
    }
  }, [step]);

  function handleOpenChange(next: boolean) {
    // A request in flight is not abandoned by Escape.
    if (!next && pending) return;
    if (!next) {
      setStep("account");
      setFailed(false);
      setStartFailed(false);
    }
    onOpenChange(next);
  }

  // The page leaves for the provider; only a request that could not start comes back here.
  async function signIn(provider: "github" | "google") {
    setStartFailed(false);
    if ((await controller.signInWithOAuth(provider)) === "failed") setStartFailed(true);
  }

  async function requestDeletion() {
    setPending(true);
    setFailed(false);
    const result = await controller.requestAccountDeletion();
    setPending(false);
    // A recorded request signs this browser out to a new guest; the toast outlives this dialog.
    if (result === "requested") showToast(toastCopy.accountDeletionScheduled);
    else setFailed(true);
  }

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent
        ref={contentRef}
        aria-busy={pending ? "true" : undefined}
        // The account step has no description paragraph; the other steps name theirs.
        {...(variant === "account" && !confirming ? { "aria-describedby": undefined } : {})}
        className="scratch-trash-dialog"
        data-app-role="account-modal"
        data-variant={variant}
        overlayClassName="scratch-trash-dialog-overlay"
      >
        {/* The themes that draw a mark beside the dialog (Retro Mac) reach it through this class; the rest hide it. */}
        <span aria-hidden="true" className="scratch-trash-dialog__mark" data-app-role="account-modal-mark">
          {confirming ? <TriangleAlert className="h-5 w-5" /> : <UserRound className="h-5 w-5" />}
        </span>
        <div className="scratch-trash-dialog__content grid gap-4">
          {confirming ? (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle>{ACCOUNT_MODAL.confirm.title}</AlertDialogTitle>
                <AlertDialogDescription>{ACCOUNT_MODAL.confirm.body}</AlertDialogDescription>
              </AlertDialogHeader>
              <p
                aria-live="polite"
                className="scratch-trash-dialog__state min-h-5 text-sm font-medium"
                role="status"
              >
                {failed ? ACCOUNT_MODAL.confirm.deleteFailed : ""}
              </p>
              <AlertDialogFooter>
                <AlertDialogCancel
                  disabled={pending}
                  onClick={(event) => {
                    event.preventDefault();
                    setFailed(false);
                    setStep("account");
                  }}
                >
                  {ACCOUNT_MODAL.confirm.cancel}
                </AlertDialogCancel>
                <Button disabled={pending} type="button" variant="destructive" onClick={() => void requestDeletion()}>
                  {ACCOUNT_MODAL.confirm.delete}
                </Button>
              </AlertDialogFooter>
            </>
          ) : variant === "guest" ? (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle>{ACCOUNT_MODAL.guest.heading}</AlertDialogTitle>
                <AlertDialogDescription asChild>
                  <div className="grid gap-1.5">
                    <p>{ACCOUNT_MODAL.guest.retention}</p>
                    <p>{ACCOUNT_MODAL.guest.signInNote}</p>
                  </div>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <p
                aria-live="polite"
                className="scratch-trash-dialog__state min-h-5 text-sm font-medium"
                role="status"
              >
                {startFailed ? ACCOUNT_MODAL.guest.signInError : (signInError ?? "")}
              </p>
              <div className="border-t pt-4">
                <p className="text-xs text-muted-foreground" style={{ lineHeight: 1.5 }}>
                  {ACCOUNT_MODAL.privacy}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button type="button" variant="outline" onClick={() => void signIn("github")}>
                  {ACCOUNT_MODAL.guest.signInGithub}
                </Button>
                <Button type="button" variant="outline" onClick={() => void signIn("google")}>
                  {ACCOUNT_MODAL.guest.signInGoogle}
                </Button>
              </div>
              <AlertDialogFooter>
                <AlertDialogCancel>{ACCOUNT_MODAL.close}</AlertDialogCancel>
              </AlertDialogFooter>
            </>
          ) : (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle>{controller.getAccountName() ?? ACCOUNT_BUTTON_LABEL}</AlertDialogTitle>
              </AlertDialogHeader>
              <div className="flex items-center justify-between gap-2 border-t pt-4">
                <Button
                  className="border-destructive/50 text-destructive"
                  type="button"
                  variant="outline"
                  onClick={() => setStep("confirm")}
                >
                  {ACCOUNT_MODAL.account.deleteAccount}
                </Button>
                <Button type="button" variant="outline" onClick={() => void controller.signOut()}>
                  {ACCOUNT_MODAL.account.signOut}
                </Button>
              </div>
              <AlertDialogFooter>
                <AlertDialogCancel>{ACCOUNT_MODAL.close}</AlertDialogCancel>
              </AlertDialogFooter>
            </>
          )}
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}
