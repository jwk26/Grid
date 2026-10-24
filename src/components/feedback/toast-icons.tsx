import { Check, WifiOff } from "lucide-react";
import type { ReactNode } from "react";

// The toast icon: 16px in an 18px box, coloured by the toast's kind in
// globals.css (DESIGN_TOKENS §Approved status surface realization — `DP-FB-01`,
// Toast surface).
function ToastIconBox({ glyph, children }: { glyph: string; children: ReactNode }) {
  return (
    <span aria-hidden="true" className="toast-icon-box" data-toast-icon={glyph}>
      {children}
    </span>
  );
}

const checkIcon = (
  <ToastIconBox glyph="check">
    <Check strokeWidth={3} />
  </ToastIconBox>
);

const exclamationIcon = <ToastIconBox glyph="exclamation">!</ToastIconBox>;

/** The offline write-attempt warning passes this as its `icon`. */
export const offlineToastIcon = (
  <ToastIconBox glyph="wifi-off">
    <WifiOff strokeWidth={2.2} />
  </ToastIconBox>
);

/** The `icons` prop of the app's `Toaster`; other kinds keep the library's own. */
export const toastIcons = {
  success: checkIcon,
  warning: exclamationIcon,
  error: exclamationIcon,
  close: <span aria-hidden="true">×</span>,
};
