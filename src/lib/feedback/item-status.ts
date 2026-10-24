/**
 * Item status vocabulary shared by the status primitives (feedback F02, F03).
 * Pure: no React, no command state.
 */
export type ItemStatus = "pending" | "unknown" | "reconciling" | "problem";

export type StatusGlyph = "loader" | "question" | "exclamation";

/**
 * The glyph an item shows for its status, given whether the display delay has
 * passed. `pending` shows nothing until the loader is due, so a fast result
 * leaves no trace. `reconciling` keeps the `?` it showed until the loader is
 * due.
 */
export function resolveStatusGlyph(
  status: ItemStatus | null,
  loaderDue: boolean,
): StatusGlyph | null {
  switch (status) {
    case null:
      return null;
    case "pending":
      return loaderDue ? "loader" : null;
    case "reconciling":
      return loaderDue ? "loader" : "question";
    case "unknown":
      return "question";
    case "problem":
      return "exclamation";
  }
}

/** Only `?` and `!` add item emphasis; the loader is the icon alone (F03). */
export function glyphHasEmphasis(glyph: StatusGlyph | null): boolean {
  return glyph === "question" || glyph === "exclamation";
}
