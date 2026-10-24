// Grid dimensions
export const GRID_COLS = 18;
export const GRID_ROWS = 9;

// Aging thresholds (days since mtime)
export const AGING_FRESH_DAYS = 5;
export const AGING_STAGNANT_DAYS = 11;

// Urgency thresholds (days until deadline)
export const URGENCY_LEVEL_1_DAYS = 3;
export const URGENCY_LEVEL_2_DAYS = 2;
export const URGENCY_LEVEL_3_DAYS = 1;

// Trash retention
export const TRASH_RETENTION_DAYS = 30;

// Inbox badge thresholds
export const INBOX_BADGE_WARM_THRESHOLD = 8;
export const INBOX_BADGE_HIGH_THRESHOLD = 15;

// Display delay (feedback F02): a pending or reconciling presentation shows only
// after this long. It postpones presentation and never decides success.
export const DISPLAY_DELAY_MS = 300;
