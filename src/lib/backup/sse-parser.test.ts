import { describe, expect, it } from "vitest";
import { createSseParser } from "@/lib/backup/sse-parser";

const STREAM =
  'event: step\ndata: {"step":"saving"}\n\nevent: step\ndata: {"step":"getting"}\n\nevent: result\ndata: {"status":"applied"}\n\n';
const EXPECTED = [
  { event: "step", data: '{"step":"saving"}' },
  { event: "step", data: '{"step":"getting"}' },
  { event: "result", data: '{"status":"applied"}' },
];

describe("createSseParser", () => {
  it("reads whole events from one chunk", () => {
    expect(createSseParser().push(STREAM)).toEqual(EXPECTED);
  });

  it("gives the same events whatever the split point", () => {
    for (let i = 0; i <= STREAM.length; i++) {
      const parser = createSseParser();
      expect([...parser.push(STREAM.slice(0, i)), ...parser.push(STREAM.slice(i))]).toEqual(EXPECTED);
    }
  });

  it("gives the same events one character at a time", () => {
    const parser = createSseParser();
    expect([...STREAM].flatMap((c) => parser.push(c))).toEqual(EXPECTED);
  });

  it("holds an unfinished event back", () => {
    const parser = createSseParser();
    expect(parser.push('event: result\ndata: {"status":"applied"}\n')).toEqual([]);
  });

  it("accepts CRLF, comments and an event without a name", () => {
    expect(createSseParser().push(': hi\r\ndata: x\r\n\r\n')).toEqual([{ event: "message", data: "x" }]);
  });
});
