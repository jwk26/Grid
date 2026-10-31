// A `matchMedia` for tests that answers `(min-width: Npx)` from a width the test sets, and tells
// its listeners when the answer changes. Only the min-width queries the app asks are understood.
import { vi } from "vitest";

type Listener = (event: { matches: boolean }) => void;

let width = 1440;
const lists = new Set<{ query: string; listeners: Set<Listener>; matches: boolean }>();

function evaluate(query: string): boolean {
  const match = /\(min-width:\s*(\d+)px\)/.exec(query);
  if (!match) throw new Error(`viewport-test-utils does not understand ${query}`);
  return width >= Number(match[1]);
}

export function installMatchMedia(initialWidth: number): void {
  width = initialWidth;
  lists.clear();
  vi.stubGlobal(
    "matchMedia",
    vi.fn((query: string) => {
      const entry = { query, listeners: new Set<Listener>(), matches: evaluate(query) };
      lists.add(entry);
      return {
        get matches() {
          return evaluate(query);
        },
        media: query,
        addEventListener: (_type: string, listener: Listener) => entry.listeners.add(listener),
        removeEventListener: (_type: string, listener: Listener) => entry.listeners.delete(listener),
      };
    }),
  );
}

export function setViewportWidth(next: number): void {
  width = next;
  for (const entry of lists) {
    const matches = evaluate(entry.query);
    if (matches === entry.matches) continue;
    entry.matches = matches;
    for (const listener of [...entry.listeners]) listener({ matches });
  }
}
