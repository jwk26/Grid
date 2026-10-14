const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

export function formatRelativeTime(timestamp: number): string {
  const elapsedMs = Math.max(0, Date.now() - timestamp);

  if (elapsedMs < HOUR_MS) {
    return `${Math.floor(elapsedMs / MINUTE_MS)}m ago`;
  }

  if (elapsedMs < DAY_MS) {
    return `${Math.floor(elapsedMs / HOUR_MS)}h ago`;
  }

  if (elapsedMs < 2 * DAY_MS) {
    return "yesterday";
  }

  if (elapsedMs < 7 * DAY_MS) {
    return `${Math.floor(elapsedMs / DAY_MS)} days ago`;
  }

  const date = new Date(timestamp);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = date.getDate();
  const year = String(date.getFullYear() % 100).padStart(2, "0");

  return `${day}/${month}/${year}`;
}
