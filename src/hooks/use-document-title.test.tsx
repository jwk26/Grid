import { renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useDocumentTitle } from "@/hooks/use-document-title";

describe("useDocumentTitle", () => {
  it("sets `{name} – Grid` and the app name alone for no name", () => {
    const { rerender } = renderHook(({ name }) => useDocumentTitle(name), {
      initialProps: { name: "Inbox" as string | null },
    });
    expect(document.title).toBe("Inbox – Grid");
    rerender({ name: "Plans" });
    expect(document.title).toBe("Plans – Grid");
    rerender({ name: null });
    expect(document.title).toBe("Grid");
  });
});
