import { AwsClient } from "aws4fetch";
import { buildDeleteBody, parseDeleteErrors, parseListPage } from "../_shared/s3-xml.ts";
import type { ListedObject } from "../_shared/run.ts";
import { SafeError } from "../_shared/safe-error.ts";

// S3-compatible object storage: Cloudflare R2 in production, local Supabase Storage in the gates.
// Only the five calls the function needs. A name of an error is logged, never a URL or a key.

export type ObjectStore = {
  put(key: string, body: Uint8Array | string, contentType: string): Promise<void>;
  getText(key: string): Promise<string | null>;
  list(prefix: string): Promise<ListedObject[]>;
  remove(keys: string[]): Promise<void>;
};

function env(name: string): string {
  const value = Deno.env.get(name);
  if (!value || value.startsWith("env(")) {
    console.error(`${name} is not set`);
    throw new SafeError("storage_not_configured");
  }
  return value;
}

export function createObjectStore(): ObjectStore {
  const endpoint = env("BACKUP_S3_ENDPOINT").replace(/\/$/, "");
  const bucket = env("BACKUP_S3_BUCKET");
  const aws = new AwsClient({
    accessKeyId: env("BACKUP_S3_ACCESS_KEY_ID"),
    secretAccessKey: env("BACKUP_S3_SECRET_ACCESS_KEY"),
    region: env("BACKUP_S3_REGION"),
    service: "s3",
  });
  const base = `${endpoint}/${bucket}`;
  // aws4fetch's own typings do not carry `method` under Deno's lib; the call is the standard fetch.
  const send = (url: string, init: { method: string; body: Uint8Array | string; headers: Record<string, string> }) =>
    aws.fetch(url, init as never);
  const objectUrl = (key: string) => `${base}/${key.split("/").map(encodeURIComponent).join("/")}`;

  return {
    async put(key, body, contentType) {
      const res = await send(objectUrl(key), { method: "PUT", body, headers: { "content-type": contentType } });
      await res.arrayBuffer();
      if (!res.ok) throw new SafeError(`put_${res.status}`);
    },

    async getText(key) {
      const res = await aws.fetch(objectUrl(key));
      if (res.status === 404) {
        await res.arrayBuffer();
        return null;
      }
      const text = await res.text();
      if (!res.ok) throw new SafeError(`get_${res.status}`);
      return text;
    },

    async list(prefix) {
      const out: ListedObject[] = [];
      let token: string | null = null;
      do {
        const query = new URLSearchParams({ "list-type": "2", prefix });
        if (token) query.set("continuation-token", token);
        const res = await aws.fetch(`${base}?${query}`);
        const xml = await res.text();
        if (!res.ok) throw new SafeError(`list_${res.status}`);
        const page = parseListPage(xml);
        out.push(...page.objects);
        token = page.truncated ? page.nextToken : null;
      } while (token);
      return out;
    },

    async remove(keys) {
      for (let i = 0; i < keys.length; i += 1000) {
        const res = await send(`${base}?delete`, {
          method: "POST",
          body: buildDeleteBody(keys.slice(i, i + 1000)),
          headers: { "content-type": "application/xml" },
        });
        const xml = await res.text();
        if (!res.ok) throw new SafeError(`delete_${res.status}`);
        if (parseDeleteErrors(xml).length > 0) throw new SafeError("delete_partial");
      }
    },
  };
}
