"use client";

import { Check, CornerDownLeft, Loader2, Zap } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  AnimatePresence,
  motion,
  useReducedMotion,
  type Variants,
} from "motion/react";
import {
  type FormEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  motionDuration,
  motionSpring,
} from "@/lib/animations/motion-language";
import { cn } from "@/lib/utils";

type ScratchModalProps = {
  open: boolean;
  onClose: () => void;
  /** Called once with the last captured ID when the surface goes away by any path. */
  onCaptured?: (capturedId: string) => void;
  onSubmit: (title: string) => Promise<string | void>;
  inboxNodeId?: string;
};

type SubmissionState = "idle" | "submitting" | "success";

const AUTO_CLOSE_DELAY_MS = 3000;

export function ScratchModal({
  open,
  onClose,
  onCaptured,
  onSubmit,
  inboxNodeId,
}: ScratchModalProps) {
  return (
    <AnimatePresence>
      {open && (
        <ScratchModalContent
          inboxNodeId={inboxNodeId}
          onCaptured={onCaptured}
          onClose={onClose}
          onSubmit={onSubmit}
        />
      )}
    </AnimatePresence>
  );
}

function ScratchModalContent({
  onClose,
  onCaptured,
  onSubmit,
  inboxNodeId,
}: Omit<ScratchModalProps, "open">) {
  const router = useRouter();
  const shouldReduceMotion = useReducedMotion();
  const inputRef = useRef<HTMLInputElement>(null);
  const autoCloseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const capturedIdRef = useRef<string | undefined>(undefined);
  const capturedReportedRef = useRef(false);
  const onCapturedRef = useRef(onCaptured);
  useEffect(() => {
    onCapturedRef.current = onCaptured;
  }, [onCaptured]);
  const [title, setTitle] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const [submissionState, setSubmissionState] =
    useState<SubmissionState>("idle");
  const trimmedTitle = title.trim();
  const hasContent = trimmedTitle.length > 0;
  const isSubmitting = submissionState === "submitting";
  const isSuccess = submissionState === "success";
  const contentExitDuration = shouldReduceMotion
    ? motionDuration.modalExit
    : motionDuration.contentExit;
  const contentEnterDuration = shouldReduceMotion
    ? motionDuration.modalEnter
    : motionDuration.contentEnter;

  const clearAutoCloseTimer = useCallback(() => {
    if (autoCloseTimerRef.current !== null) {
      clearTimeout(autoCloseTimerRef.current);
      autoCloseTimerRef.current = null;
    }
  }, []);

  const reportCaptured = useCallback(() => {
    const capturedId = capturedIdRef.current;
    if (capturedId === undefined || capturedReportedRef.current) return;
    capturedReportedRef.current = true;
    onCapturedRef.current?.(capturedId);
  }, []);

  // The surface can also go away without handleClose (another overlay replaces it).
  useEffect(() => reportCaptured, [reportCaptured]);

  const handleClose = useCallback(() => {
    clearAutoCloseTimer();
    reportCaptured();
    onClose();
  }, [clearAutoCloseTimer, onClose, reportCaptured]);

  const startAutoCloseTimer = useCallback(() => {
    clearAutoCloseTimer();
    autoCloseTimerRef.current = setTimeout(() => {
      handleClose();
    }, AUTO_CLOSE_DELAY_MS);
  }, [clearAutoCloseTimer, handleClose]);

  useEffect(() => {
    if (submissionState !== "idle") {
      return;
    }

    inputRef.current?.focus();
  }, [submissionState]);

  useEffect(() => {
    if (!isSuccess) {
      return;
    }

    startAutoCloseTimer();

    return () => {
      clearAutoCloseTimer();
    };
  }, [clearAutoCloseTimer, isSuccess, startAutoCloseTimer]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        handleClose();
      }
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleClose]);

  const backdropVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { duration: motionDuration.modalEnter, ease: "easeOut" },
    },
    exit: {
      opacity: 0,
      transition: { duration: motionDuration.modalExit, ease: "easeIn" },
    },
  };

  const panelVariants: Variants = {
    hidden: {
      opacity: 0,
      scale: shouldReduceMotion ? 1 : 0.98,
      y: shouldReduceMotion ? 0 : 10,
    },
    visible: {
      opacity: 1,
      scale: 1,
      y: 0,
      transition: shouldReduceMotion
        ? { duration: motionDuration.modalEnter, ease: "easeOut" }
        : {
            opacity: motionSpring.creation,
            scale: motionSpring.scale,
            y: motionSpring.creation,
          },
    },
    exit: {
      opacity: 0,
      scale: shouldReduceMotion ? 1 : 0.98,
      y: shouldReduceMotion ? 0 : 10,
      transition: { duration: motionDuration.modalExit, ease: "easeIn" },
    },
  };

  const captureContentVariants: Variants = {
    hidden: {
      opacity: 0,
      y: shouldReduceMotion ? 0 : 4,
      transition: {
        duration: contentExitDuration,
        ease: "easeIn",
      },
    },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: contentEnterDuration,
        ease: "easeOut",
      },
    },
    exit: {
      opacity: 0,
      y: shouldReduceMotion ? 0 : -4,
      transition: {
        duration: contentExitDuration,
        ease: "easeIn",
      },
    },
  };

  const confirmationContentVariants: Variants = {
    hidden: {
      opacity: 0,
      y: shouldReduceMotion ? 0 : 4,
      transition: {
        duration: contentExitDuration,
        ease: "easeIn",
      },
    },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: contentEnterDuration,
        ease: "easeOut",
      },
    },
    exit: {
      opacity: 0,
      y: shouldReduceMotion ? 0 : -4,
      transition: {
        duration: contentExitDuration,
        ease: "easeIn",
      },
    },
  };

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!hasContent || isSubmitting) {
      return;
    }

    setSubmissionState("submitting");

    try {
      const capturedId = await onSubmit(trimmedTitle);
      if (typeof capturedId === "string") {
        capturedIdRef.current = capturedId;
      }
      setSubmissionState("success");
    } catch {
      setSubmissionState("idle");
    }
  }

  function handleCaptureAnother() {
    clearAutoCloseTimer();
    setTitle("");
    setSubmissionState("idle");
  }

  function handleOpenInbox() {
    if (inboxNodeId !== undefined) {
      router.push(`/grid/${inboxNodeId}`);
    }

    handleClose();
  }

  function handlePanelMouseEnter() {
    if (isSuccess) {
      clearAutoCloseTimer();
    }
  }

  function handlePanelMouseLeave() {
    if (isSuccess) {
      startAutoCloseTimer();
    }
  }

  return (
    <>
      <motion.div
        animate="visible"
        aria-hidden="true"
        className="fixed inset-0 z-[400] bg-background/80 backdrop-blur-sm"
        exit="exit"
        initial="hidden"
        onMouseDown={handleClose}
        variants={backdropVariants}
      />
      <div className="fixed inset-0 z-[400] flex items-center justify-center p-4 pointer-events-none">
        <motion.div
          animate="visible"
          aria-label="Scratch capture"
          aria-modal="true"
          className={cn(
            "pointer-events-auto relative w-full max-w-lg bg-popover border border-border shadow-2xl rounded-2xl overflow-hidden p-4 transition-colors",
            isFocused && "ring-2 ring-ring ring-offset-2 border-primary/30",
          )}
          exit="exit"
          initial="hidden"
          onMouseEnter={handlePanelMouseEnter}
          onMouseLeave={handlePanelMouseLeave}
          role="dialog"
          variants={panelVariants}
        >
          <AnimatePresence mode="wait" initial={false}>
            {isSuccess ? (
              <motion.div
                animate="visible"
                className="flex min-h-11 items-center gap-3"
                exit="exit"
                initial="hidden"
                key="confirmation"
                variants={confirmationContentVariants}
              >
                <Check className="w-5 h-5 shrink-0 text-emerald-500 fill-emerald-500/10" />
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <div className="text-sm font-medium text-foreground">
                    Idea captured!
                  </div>
                  <div className="text-muted-foreground text-xs">
                    Saved to Inbox
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <button
                    autoFocus={inboxNodeId !== undefined}
                    className="text-xs text-primary hover:text-primary/80 hover:underline outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-sm disabled:pointer-events-none disabled:opacity-50"
                    disabled={inboxNodeId === undefined}
                    onClick={handleOpenInbox}
                    type="button"
                  >
                    Open Inbox
                  </button>
                  <button
                    autoFocus={inboxNodeId === undefined}
                    className="text-muted-foreground hover:text-foreground bg-secondary px-2 py-1 rounded text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    onClick={handleCaptureAnother}
                    type="button"
                  >
                    Capture another
                  </button>
                </div>
              </motion.div>
            ) : (
              <motion.div
                animate="visible"
                exit="exit"
                initial="hidden"
                key="capture"
                variants={captureContentVariants}
              >
                <form
                  className={cn(
                    "flex min-h-11 items-center gap-3",
                    isSubmitting && "opacity-50",
                  )}
                  onSubmit={handleSubmit}
                >
                  <Zap className="w-5 h-5 shrink-0 text-primary fill-primary" />
                  <input
                    aria-label="Scratch title"
                    autoFocus
                    className="min-w-0 flex-1 bg-transparent text-lg text-foreground placeholder:text-muted-foreground/60 outline-none disabled:cursor-not-allowed"
                    disabled={isSubmitting}
                    onBlur={() => setIsFocused(false)}
                    onChange={(event) => setTitle(event.target.value)}
                    onFocus={() => setIsFocused(true)}
                    placeholder="Capture your ideas..."
                    ref={inputRef}
                    type="text"
                    value={title}
                  />
                  <button
                    aria-label="Capture scratch"
                    className={cn(
                      "flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-primary transition outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                      hasContent
                        ? "opacity-100 scale-100 hover:bg-accent"
                        : "pointer-events-none opacity-0 scale-95",
                    )}
                    disabled={!hasContent || isSubmitting}
                    style={{
                      transitionDuration: `${motionDuration.affordance}s`,
                    }}
                    type="submit"
                  >
                    {isSubmitting ? (
                      <Loader2 className="w-4 h-4 animate-spin text-primary" />
                    ) : (
                      <CornerDownLeft className="w-4 h-4" />
                    )}
                  </button>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </>
  );
}
