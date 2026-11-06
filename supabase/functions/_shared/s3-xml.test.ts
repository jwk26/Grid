import { describe, expect, it } from "vitest";
import { buildDeleteBody, parseDeleteErrors, parseListPage } from "./s3-xml.ts";

describe("s3 xml", () => {
  it("parses a list page with a continuation token", () => {
    const xml = `<ListBucketResult><IsTruncated>true</IsTruncated><NextContinuationToken>a&amp;b</NextContinuationToken>
      <Contents><Key>accounts/x/1.json.gz</Key><Size>10</Size></Contents><Contents><Key>accounts/x/2&amp;3</Key><Size>5</Size></Contents></ListBucketResult>`;
    expect(parseListPage(xml)).toEqual({
      objects: [{ key: "accounts/x/1.json.gz", size: 10 }, { key: "accounts/x/2&3", size: 5 }],
      truncated: true,
      nextToken: "a&b",
    });
  });
  it("parses a last page", () => {
    expect(parseListPage("<ListBucketResult><IsTruncated>false</IsTruncated></ListBucketResult>")).toEqual({ objects: [], truncated: false, nextToken: null });
  });
  it("builds a quiet delete body with escaped keys and refuses 0 or over 1000 keys", () => {
    expect(buildDeleteBody(["a&b"])).toBe("<Delete><Quiet>true</Quiet><Object><Key>a&amp;b</Key></Object></Delete>");
    expect(() => buildDeleteBody([])).toThrow();
    expect(() => buildDeleteBody(Array.from({ length: 1001 }, (_, i) => String(i)))).toThrow();
  });
  it("reads the keys of a delete answer's errors", () => {
    expect(parseDeleteErrors("<DeleteResult><Error><Key>k1</Key><Code>AccessDenied</Code></Error></DeleteResult>")).toEqual(["k1"]);
    expect(parseDeleteErrors("<DeleteResult></DeleteResult>")).toEqual([]);
  });
});
