"use client";

import { useCallback, useRef, useState } from "react";

export type StatusAnnouncementMessage = Readonly<{ id: number; text: string }>;

/**
 * A visually hidden polite live region for the success announcements of
 * feedback F04 (`Added.`, `Returned to Breakdown.`, `Saved.`): success shows
 * nothing on screen, and screen readers hear the sentence once. The `id`
 * remounts the text node, so the same sentence announced twice in a row is
 * heard twice.
 */
export function StatusAnnouncement({
  announcement,
}: {
  announcement: StatusAnnouncementMessage | null;
}) {
  return (
    <div
      data-feedback-role="status-announcement"
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className="sr-only"
    >
      {announcement === null ? null : (
        <span key={announcement.id}>{announcement.text}</span>
      )}
    </div>
  );
}

/** State for a `StatusAnnouncement`: render it, call `announce(text)` once per success. */
export function useStatusAnnouncement(): {
  announcement: StatusAnnouncementMessage | null;
  announce: (text: string) => void;
} {
  const [announcement, setAnnouncement] =
    useState<StatusAnnouncementMessage | null>(null);
  const nextIdRef = useRef(1);
  const announce = useCallback((text: string) => {
    setAnnouncement({ id: nextIdRef.current++, text });
  }, []);
  return { announcement, announce };
}
