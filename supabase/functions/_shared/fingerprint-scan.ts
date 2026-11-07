// Takes the `fingerprint` key out of an `export_account()` value while it streams by, without
// parsing it (Task 261 advisory note: the expected fingerprint of a restore is the very value
// uploaded as the pre-restore file). A string value of the export escapes its quotes, so an
// unescaped `"fingerprint": "<32 hex>"` can only be the top-level key. Exactly one match is
// accepted; none, or more than one, is a failure and the restore stops.

const PATTERN = /"fingerprint"\s{0,4}:\s{0,4}"([0-9a-f]{32})"/g;
/** Longer than the longest match (13 + 4 + 1 + 4 + 34), so a key split across chunks is still seen whole. */
const CARRY = 64;
const LATIN1 = new TextDecoder("latin1");

export type FingerprintScan = { kind: "ok"; fingerprint: string } | { kind: "none" } | { kind: "multiple" };

export class FingerprintScanner {
  private carry = "";
  private offset = 0; // absolute index of carry[0] in the whole stream
  private seenUntil = 0; // absolute end of the last counted match
  private found: string[] = [];

  push(chunk: Uint8Array): void {
    // latin1 keeps one char per byte, so a multi-byte character split across chunks cannot shift
    // offsets; the decoder is about 15 times faster than building the string from char codes.
    const buffer = this.carry + LATIN1.decode(chunk);
    for (const m of buffer.matchAll(PATTERN)) {
      const start = this.offset + (m.index ?? 0);
      if (start < this.seenUntil) continue; // already counted from the previous buffer
      this.found.push(m[1]);
      this.seenUntil = start + m[0].length;
    }
    const keepFrom = Math.max(0, buffer.length - CARRY);
    this.carry = buffer.slice(keepFrom);
    this.offset += keepFrom;
  }

  result(): FingerprintScan {
    if (this.found.length === 1) return { kind: "ok", fingerprint: this.found[0] };
    return { kind: this.found.length === 0 ? "none" : "multiple" };
  }
}
