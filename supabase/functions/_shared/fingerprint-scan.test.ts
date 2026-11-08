import { describe, expect, it } from "vitest";
import { FingerprintScanner } from "./fingerprint-scan.ts";

const FP = "0123456789abcdef0123456789abcdef";
const enc = (s: string) => new TextEncoder().encode(s);
const doc = `{"bits": [{"title": "has \\"fingerprint\\": \\"${FP}\\" inside"}], "exported_at": 5, "fingerprint": "${FP}", "format_version": 1, "nodes": []}`;

function scanChunks(parts: Uint8Array[]) {
  const s = new FingerprintScanner();
  for (const p of parts) s.push(p);
  return s.result();
}

describe("FingerprintScanner", () => {
  it("finds the top-level key and ignores an escaped one inside a string value", () => {
    expect(scanChunks([enc(doc)])).toEqual({ kind: "ok", fingerprint: FP });
  });

  it("finds the key at every split point of the stream", () => {
    const bytes = enc(doc);
    for (let at = 1; at < bytes.length; at++) {
      expect(scanChunks([bytes.subarray(0, at), bytes.subarray(at)])).toEqual({ kind: "ok", fingerprint: FP });
    }
  });

  it("finds the key in one-byte chunks, once", () => {
    const bytes = enc(doc);
    expect(scanChunks([...bytes].map((b) => new Uint8Array([b])))).toEqual({ kind: "ok", fingerprint: FP });
  });

  it("handles a multi-byte character split across chunks", () => {
    const bytes = enc(`{"bits": ["한글"], "fingerprint": "${FP}"}`);
    for (let at = 1; at < bytes.length; at++) {
      expect(scanChunks([bytes.subarray(0, at), bytes.subarray(at)]).kind).toBe("ok");
    }
  });

  it("reports none when the key is missing or malformed", () => {
    expect(scanChunks([enc('{"bits": []}')])).toEqual({ kind: "none" });
    expect(scanChunks([enc('{"fingerprint": "xyz"}')])).toEqual({ kind: "none" });
    expect(scanChunks([enc(`{"fingerprint": "${FP.toUpperCase()}"}`)])).toEqual({ kind: "none" });
  });

  it("reports multiple when the key appears twice, however it is split", () => {
    const two = enc(`{"fingerprint": "${FP}", "x": {"fingerprint": "${FP}"}}`);
    expect(scanChunks([two])).toEqual({ kind: "multiple" });
    for (let at = 1; at < two.length; at++) {
      expect(scanChunks([two.subarray(0, at), two.subarray(at)])).toEqual({ kind: "multiple" });
    }
  });
});
