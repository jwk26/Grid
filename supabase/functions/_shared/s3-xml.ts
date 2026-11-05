// The two XML shapes the function reads and writes for S3-compatible storage (R2 and local Storage).
// Pure: no network.

export type ListedObject = { key: string; size: number };
export type ListPage = { objects: ListedObject[]; truncated: boolean; nextToken: string | null };

const unescapeXml = (s: string) =>
  s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, "&");
const escapeXml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");

/** One ListObjectsV2 page. */
export function parseListPage(xml: string): ListPage {
  const objects: ListedObject[] = [];
  for (const m of xml.matchAll(/<Contents>([\s\S]*?)<\/Contents>/g)) {
    const key = /<Key>([\s\S]*?)<\/Key>/.exec(m[1]);
    const size = /<Size>(\d+)<\/Size>/.exec(m[1]);
    if (key && size) objects.push({ key: unescapeXml(key[1]), size: Number(size[1]) });
  }
  const truncated = /<IsTruncated>true<\/IsTruncated>/.test(xml);
  const next = /<NextContinuationToken>([\s\S]*?)<\/NextContinuationToken>/.exec(xml);
  return { objects, truncated, nextToken: next ? unescapeXml(next[1]) : null };
}

/** The DeleteObjects body for up to 1000 keys. */
export function buildDeleteBody(keys: string[]): string {
  if (keys.length === 0 || keys.length > 1000) throw new Error("DeleteObjects takes 1 to 1000 keys");
  return `<Delete><Quiet>true</Quiet>${keys.map((k) => `<Object><Key>${escapeXml(k)}</Key></Object>`).join("")}</Delete>`;
}

/** Keys the DeleteObjects answer reports as errors (a quiet answer lists only those). */
export function parseDeleteErrors(xml: string): string[] {
  return [...xml.matchAll(/<Error>([\s\S]*?)<\/Error>/g)].map((m) => {
    const key = /<Key>([\s\S]*?)<\/Key>/.exec(m[1]);
    return key ? unescapeXml(key[1]) : "?";
  });
}
