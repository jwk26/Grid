// Task 264 (expert review item 2): whether the hosted measurement may run now. Pure.
// Dispatch 17:00 UTC, summary 19:00 UTC, cleanup 03:17 UTC. The account lives about ten minutes, so a run is refused
// within 25 minutes before and 8 minutes after a cron run. `--skip-cron-window` is for a project whose cron jobs
// are unscheduled (the drill) and is refused while any job is active.
const WINDOWS: [string, number][] = [["backup-dispatch 17:00", 1020], ["backup-summary-dispatch 19:00", 1140], ["cleanup-guests 03:17", 197]];

export function cronWindowProblem(now: Date = new Date()): string | null {
  const m = now.getUTCHours() * 60 + now.getUTCMinutes();
  for (const [label, w] of WINDOWS) {
    const ahead = (w - m + 1440) % 1440; // minutes until the next one
    const behind = (m - w + 1440) % 1440; // minutes since the last one
    if (ahead <= 25 || behind <= 8) return `${label} UTC is ${ahead <= 25 ? `${ahead} min away` : `${behind} min behind`}`;
  }
  return null;
}

export function measureWindowProblem(o: { isLocal: boolean; skipWindow: boolean; cronActive: number; now?: Date }): string | null {
  if (o.isLocal) return null;
  if (o.skipWindow) return o.cronActive > 0 ? `--skip-cron-window needs every cron job unscheduled, ${o.cronActive} active` : null;
  return cronWindowProblem(o.now);
}
