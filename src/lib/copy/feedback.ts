import { APP_NAME } from "@/lib/constants";

// Toast, app-state and blocking copy (SPEC §Feedback copy). Later tasks add
// their sentences here.

/**
 * `target` is the Node whose Grid receives the item: the current Node, the
 * parent chosen for a Bit created from L0, or `Home` for a Node created at L0.
 */
export function createDialogNoEmptyCell(target: string): string {
  return `“${target}” has no empty cell. Move or delete an item to make room.`;
}

/** A create the server refused inside a dialog, for the account limit (inline, no toast). */
export function createDialogAccountLimit(limit: number, items: string): string {
  return `This account has reached its limit of ${limit} ${items}.`;
}

/** A create the server refused inside a dialog, for any other reason (inline, no toast). */
export function createDialogFailed(title: string): string {
  return `Couldn't create “${title}”. Try again.`;
}

/** A Node edit the server refused inside the edit dialog (inline, no toast). `title` is the saved title. */
export function editDialogFailed(title: string): string {
  return `Couldn't save the changes to “${title}”. Try again.`;
}

// What a server-confirmed control's loader says while it waits (SPEC §Write feel, group 3).
export const PENDING_SENTENCE = {
  restore: "Restoring…",
  permanentDelete: "Deleting…",
  emptyTrash: "Emptying Trash…",
  promote: "Promoting…",
  deleteStep: "Deleting…",
} as const;

// The account icon and the connection states (SPEC §Feedback copy, Connection). The icon's
// name is the same for a guest and an account; the sentence is its tooltip and description only
// while the connection is unstable or offline.
export const HOME_BUTTON_LABEL = "Home";

/** The tab title of a page: `{name} – {app name}`, or the app name alone when there is no page name. */
export function tabTitle(pageName?: string | null): string {
  return pageName ? `${pageName} – ${APP_NAME}` : APP_NAME;
}

export const ACCOUNT_BUTTON_LABEL = "Account";

export const CONNECTION_SENTENCE = {
  unstable: "Connection is unstable. Changes may take longer to save.",
  offline: "You're offline. You can look around, but changes can't be saved.",
  recovered: "Back online.",
} as const;

// App-level screens (SPEC §Feedback copy, App-level screens).
export const LOADING = { title: "Loading your grid…" } as const;

const UNREACHABLE_REASON = "The server can't be reached. Check your connection and try again.";

export const LOAD_FAILURE = {
  title: "Couldn't load your grid.",
  reason: {
    unreachable: UNREACHABLE_REASON,
    other: "Something went wrong while loading.",
  },
  retry: "Retry",
} as const;

// The Grid of a route the account cannot use (SPEC §Feedback copy, Dialogs and shell; ST18, ST30).
export const GRID_UNAVAILABLE = {
  title: "Couldn't open this Grid.",
  reason: "It may have been deleted, moved to Trash or archived, or it may belong to another account.",
  goHome: "Go to Home",
  addRestricted: "Adding restricted on this page",
} as const;

export const GUEST_CREATION_FAILURE = {
  title: "Couldn't start a guest session.",
  reason: {
    turnstile: "The security check didn't pass.",
    "rate-limit": "Too many guest sessions were started from this network. Try again later.",
    unreachable: UNREACHABLE_REASON,
    other: "Something went wrong while loading.",
  },
  retry: "Retry",
} as const;

export const SECURITY_CHECK = {
  title: "Confirm you're human to continue.",
} as const;

export const SESSION_EXPIRED = {
  account: {
    title: "Your sign-in expired.",
    reason: "Your saved data is safe. The last change may not have been saved.",
  },
  guest: {
    title: "Your guest session ended.",
    reason: "Guest data may have been deleted. You can start a new guest session or sign in.",
  },
  continueAsGuest: "Continue as guest",
} as const;

// The deletion-grace dialog (SPEC §Deletion-grace dialog, §Feedback copy; DESIGN_TOKENS BK-7).
export const DELETION_GRACE = {
  title: "This account will be deleted",
  /** `<time>` is the request plus 24 hours, in the user's time zone and locale. */
  deadline: (time: string) => `You can cancel until ${time}.`,
  countdownLabel: "left to cancel",
  zero: "The deletion can start at any time now.",
  cancel: "Cancel deletion",
  continueAsGuest: "Continue as guest",
  cancelFailed: "Couldn't cancel the deletion. Try again.",
} as const;

// The narrow-window notice (SPEC §Account entry step 1, §Feedback copy; S42 (4)).
export const NARROW_WINDOW = {
  title: "Please use a larger window.",
  reason: "Grid needs a window at least 1024 pixels wide, such as a desktop browser.",
} as const;

export const ACCOUNT_DELETED = {
  title: "This account was deleted.",
  reason: "Its data is gone. You can continue as a guest.",
  continueAsGuest: "Continue as guest",
} as const;

// The account modal (SPEC §Feedback copy, Account modal). `deleteFailed` is the confirmation's inline
// line when the request failed or its outcome is not known; `close` is the modal's Close button.
export const ACCOUNT_MODAL = {
  guest: {
    heading: "You're browsing as a guest",
    retention: "Guest data is deleted 7 days after your last visit.",
    signInNote: "Signing in opens a new, empty account. Guest data isn't moved to it.",
    signInError: "Sign-in didn't complete. You're still browsing as a guest.",
    signInGithub: "Sign in with GitHub",
    signInGoogle: "Sign in with Google",
  },
  privacy:
    "Grid keeps your tasks in a Supabase database in Seoul. Signing in with GitHub or Google gives Grid your name, email address and profile picture, used only to identify your account. Signed-in accounts are also backed up every day to Cloudflare, outside the main database. A Cloudflare Turnstile check protects guest sign-in. You can delete your account and all its data, backups included, at any time.",
  account: { signOut: "Sign out", deleteAccount: "Delete account" },
  confirm: {
    title: "Delete your account?",
    body: "You can cancel within 24 hours by signing in again. After that, your account, its data and its backups are deleted.",
    delete: "Delete account",
    cancel: "Cancel",
    deleteFailed: "Couldn't delete your account. Try again.",
  },
  close: "Close",
} as const;

// The Backup button and dialog (SPEC §Feedback copy, Backup; Phases 52-53). `<time>` is a
// timestamp in the user's time zone and locale, never an object name's UTC date.
export const BACKUP_BUTTON_LABEL = "Backup";

export function formatBackupTime(ms: number, locale?: string, timeZone?: string): string {
  return new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short", timeZone }).format(new Date(ms));
}

export const BACKUP_COPY = {
  guest: {
    title: "Keep your Grid safe",
    note: "Signed-in accounts are backed up every day, outside the main database, and can be restored.",
  },
  checking: "Checking…",
  running: "Backing up…",
  green: (time: string) => `Backed up. Latest backup: ${time}`,
  yellow: (time: string) => `No backup check in over 7 days. Latest backup: ${time}`,
  gray: "Not backed up yet. The first backup runs within a day.",
  red: "The last backup failed.",
  redReason: (reason: string | null) =>
    reason === "too_large" ? "This account is too large to back up." : "It runs again tomorrow.",
  readFailed: "Couldn't check the backup status.",
  checkAgain: "Check again",
  backUpNow: "Back Up Now",
  close: "Close",
  unchanged: (time: string) => `No changes since the latest backup (${time}).`,
  rateLimited: "Try again in a few minutes.",
  stillFinishing: "Still finishing…",
  notStarted: "The backup didn't start. Try again.",
  privacy:
    "Backups are stored with Cloudflare, outside the main database. We keep your 7 latest backups and one a week for 4 weeks before them. Deleting your account deletes them.",
  restore: {
    action: "Restore…",
    listTitle: "Restore a backup",
    preRestoreEntry: (time: string) => `Before restore, ${time}`,
    emptyList: "No backups yet.",
    listFailed: "Couldn't load the backups.",
    confirm: (time: string) =>
      `This replaces everything in this account with the backup from ${time}. The current state is saved first, so you can undo this.`,
    confirmAction: "Restore",
    cancel: "Cancel",
    accountChanged: "This account changed while restoring. Try again.",
    unsupportedFormat: "This backup comes from an older version of Grid and can't be restored.",
    notApplied: "The backup wasn't applied. Your data is unchanged.",
  },
} as const;

// The restoring screen (SPEC §Account backup, Restore; DESIGN_TOKENS BK-6).
export const RESTORING_COPY = {
  title: "Restoring a backup",
  reason: "Don't close this tab. Grid opens again when it's done.",
  otherTitle: "A backup is being restored in another tab",
  otherReason: "Grid opens again with the restored data when it's done.",
  steps: { saving: "Saving the current state", getting: "Getting the backup", applying: "Applying the backup" },
  stepsLabel: "Restore steps",
} as const;

// Toasts (SPEC §Feedback copy, Toasts). A row is one kind of toast: `key` is what the toast helper
// groups by (a repeat of a key while it is visible updates the one toast), `tone` belongs to the
// key. `counted` is the form for a count above one; a row without it shows the latest single text.
export type ToastTone = "success" | "failure" | "warning";

export type ToastRow<Args extends unknown[] = []> = {
  key: string;
  tone: ToastTone;
  /** The icon the toast carries instead of its tone's default. */
  glyph?: "wifi-off";
  single: (...args: Args) => string;
  counted?: (count: number) => string;
};

// The rolled-back rows share one key, so a burst of different failed writes shows one counted toast.
const ROLLED_BACK = "rolled-back";
const rolledBackCounted = (count: number) => `Couldn't save ${count} changes. They were put back.`;

export const toastCopy = {
  rolledBackMove: {
    key: ROLLED_BACK,
    tone: "failure",
    single: (title: string) => `Couldn't move “${title}”. It's back where it was.`,
    counted: rolledBackCounted,
  },
  rolledBackEdit: {
    key: ROLLED_BACK,
    tone: "failure",
    single: (title: string) => `Couldn't save the change to “${title}”. The saved version is back.`,
    counted: rolledBackCounted,
  },
  rolledBackDeadline: {
    key: ROLLED_BACK,
    tone: "failure",
    single: (title: string) => `Couldn't change the deadline of “${title}”. The previous one is back.`,
    counted: rolledBackCounted,
  },
  rolledBackDeadlineExtension: {
    key: ROLLED_BACK,
    tone: "failure",
    single: () => "Couldn't change the deadlines. The previous ones are back.",
    counted: rolledBackCounted,
  },
  rolledBackCompletion: {
    key: ROLLED_BACK,
    tone: "failure",
    single: (title: string) => `Couldn't update “${title}”. It's back as it was.`,
    counted: rolledBackCounted,
  },
  rolledBackCreate: {
    key: ROLLED_BACK,
    tone: "failure",
    single: (title: string) => `Couldn't create “${title}”. It was removed.`,
    counted: rolledBackCounted,
  },
  rolledBackTrash: {
    key: ROLLED_BACK,
    tone: "failure",
    single: (title: string) => `Couldn't move “${title}” to Trash. It's back in place.`,
    counted: rolledBackCounted,
  },
  rolledBackArchive: {
    key: ROLLED_BACK,
    tone: "failure",
    single: (title: string) => `Couldn't archive “${title}”. It's back in place.`,
    counted: rolledBackCounted,
  },
  accountLimit: {
    key: "account-limit",
    tone: "failure",
    single: (title: string, limit: number, items: string) =>
      `Couldn't create “${title}”. This account has reached its limit of ${limit} ${items}.`,
    counted: (count: number) => `Couldn't create ${count} items. This account has reached its limit.`,
  },
  offlineWrite: {
    key: "offline-write",
    tone: "warning",
    glyph: "wifi-off",
    single: () => "You're offline. Changes can't be saved right now.",
    counted: (count: number) => `You're offline. ${count} changes weren't saved.`,
  },
  targetGridFull: {
    key: "target-grid-full",
    tone: "failure",
    single: (title: string, target: string) =>
      `Couldn't move “${title}”. “${target}” has no empty cell.`,
    counted: (count: number) => `Couldn't move ${count} items. Their target has no empty cell.`,
  },
  moveIntoDescendant: {
    key: "move-into-descendant",
    tone: "failure",
    single: (title: string) => `Couldn't move “${title}” into a Node inside it.`,
  },
  homeFull: {
    key: "home-full",
    tone: "failure",
    single: (title: string) => `Couldn't show “${title}” on Home. Home has no empty cell.`,
  },
  restoreSucceeded: {
    key: "restore-succeeded",
    tone: "success",
    single: (title: string) => `Restored “${title}”.`,
    counted: (count: number) => `Restored ${count} items.`,
  },
  restoreBlocked: {
    key: "restore-blocked",
    tone: "failure",
    single: (title: string) => `Couldn't restore “${title}”. Its Grid has no empty cell.`,
  },
  restoreFailed: {
    key: "restore-failed",
    tone: "failure",
    single: (title: string) => `Couldn't restore “${title}”. It's still in Trash.`,
  },
  permanentDeleteSucceeded: {
    key: "permanent-delete-succeeded",
    tone: "success",
    single: (title: string) => `Deleted “${title}” permanently.`,
    counted: (count: number) => `Deleted ${count} items permanently.`,
  },
  permanentDeleteFailed: {
    key: "permanent-delete-failed",
    tone: "failure",
    single: (title: string) => `Couldn't delete “${title}”. It's still in Trash.`,
  },
  emptyTrashSucceeded: {
    key: "empty-trash-succeeded",
    tone: "success",
    single: () => "Trash emptied.",
  },
  emptyTrashFailed: {
    key: "empty-trash-failed",
    tone: "failure",
    single: () => "Couldn't empty Trash. Nothing was deleted.",
  },
  promoteFailed: {
    key: "promote-failed",
    tone: "failure",
    single: (title: string) => `Couldn't promote “${title}”. It's still a Bit.`,
  },
  stepDeleteFailed: {
    key: "step-delete-failed",
    tone: "failure",
    single: (title: string) => `Couldn't delete “${title}”. It's still there.`,
  },
  archiveRestoreFailed: {
    key: "archive-restore-failed",
    tone: "failure",
    single: (title: string) => `Couldn't restore “${title}”. It's still in Archive.`,
  },
  accountDeletionScheduled: {
    key: "account-deleted",
    tone: "success",
    single: () => "Your account will be deleted after 24 hours. Sign in again to cancel.",
  },
} as const satisfies Record<string, ToastRow<never[]>>;
