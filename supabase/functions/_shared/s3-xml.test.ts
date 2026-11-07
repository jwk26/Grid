import { describe, expect, it } from "vitest";
import { buildDeleteBody, normalizeEtag, parseDeleteErrors, parseListPage } from "./s3-xml.ts";

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

describe("parseListPage LastModified", () => {
  it("reads the object's last-modified time as epoch ms, and leaves it out when absent", () => {
    const xml = `<ListBucketResult><Contents><Key>a</Key><LastModified>2026-11-07T03:00:12.000Z</LastModified><Size>5</Size></Contents><Contents><Key>b</Key><Size>6</Size></Contents></ListBucketResult>`;
    expect(parseListPage(xml).objects).toEqual([
      { key: "a", size: 5, lastModified: Date.parse("2026-11-07T03:00:12.000Z") },
      { key: "b", size: 6 },
    ]);
  });
});

describe("ETag", () => {
  it("normalizes quotes, escaped quotes and a weak marker so a list entry and a GET header compare equal", () => {
    expect(normalizeEtag('"abc"')).toBe("abc");
    expect(normalizeEtag('W/"abc"')).toBe("abc");
    expect(normalizeEtag("abc")).toBe("abc");
    expect(normalizeEtag('""')).toBeNull();
    expect(normalizeEtag(null)).toBeNull();
  });
  it("reads the list's ETag, quoted either way", () => {
    const xml = `<ListBucketResult><Contents><Key>a</Key><ETag>&quot;e1&quot;</ETag><Size>5</Size></Contents><Contents><Key>b</Key><ETag>"e2"</ETag><Size>6</Size></Contents><Contents><Key>c</Key><Size>7</Size></Contents></ListBucketResult>`;
    expect(parseListPage(xml).objects.map((o) => o.etag)).toEqual(["e1", "e2", undefined]);
  });
});
