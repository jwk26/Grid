import { describe, expect, it } from "vitest";
import { classifyExportHead } from "./export-head.ts";

const enc = (s: string) => new TextEncoder().encode(s);

describe("classifyExportHead", () => {
  it("accepts an export that begins with its bits key, with or without the jsonb space", () => {
    expect(classifyExportHead(enc('{"bits": [{"id": "x"}], "nodes": []}'))).toBe("export");
    expect(classifyExportHead(enc('{"bits":[]'))).toBe("export");
  });
  it("recognises a rejection", () => {
    expect(classifyExportHead(enc('{"rejection": {"code": "account_deleting"}}'))).toBe("rejection");
  });
  it("treats anything else as unknown, so nothing is uploaded", () => {
    for (const s of ["", "{", "[]", '{"message": "permission denied"}', '{"nodes": []}', '{"bits": 1}', "<html>"]) {
      expect(classifyExportHead(enc(s)), s).toBe("unknown");
    }
  });
});
