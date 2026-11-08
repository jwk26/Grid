import { createGzip } from "node:zlib";
import { classifyExportHead, EXPORT_HEAD_BYTES } from "../_shared/export-head.ts";
import { classifyExportFailure } from "../_shared/export-failure.ts";
import { FingerprintScanner } from "../_shared/fingerprint-scan.ts";
import type { ExportAnswer } from "../_shared/run.ts";

function concat(parts: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.byteLength, 0));
  let at = 0;
  for (const p of parts) {
    out.set(p, at);
    at += p.byteLength;
  }
  return out;
}

/**
 * Streams `export_account()` from PostgREST into gzip level 1 (`node:zlib`; the web CompressionStream
 * takes no level) without parsing it. The compressed chunks are joined once, so memory stays near
 * the compressed size twice at the join. Only a body that begins with its `bits` key is compressed;
 * a rejection ends the run, anything else is `export_unreadable`. With `scanFingerprint` it also returns the
 * export's own `fingerprint` key (null unless exactly one is found).
 */
export async function exportGzip(userId: string, opts: { scanFingerprint?: boolean } = {}): Promise<ExportAnswer> {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) {
    console.error(`${!url ? "SUPABASE_URL" : "SUPABASE_SERVICE_ROLE_KEY"} is not set`);
    return { kind: "failed", reason: "export_failed" };
  }
  let res: Response;
  try {
    res = await fetch(`${url}/rest/v1/rpc/export_account`, {
      method: "POST",
      headers: { apikey: key, authorization: `Bearer ${key}`, "content-type": "application/json" },
      body: JSON.stringify({ p_user_id: userId }),
    });
  } catch {
    return { kind: "failed", reason: "export_failed" };
  }
  if (!res.ok) {
    // A failure body is a small JSON error; read at most what PostgREST sends.
    let text = "";
    try {
      text = (await res.text()).slice(0, 2000);
    } catch {
      // keep the empty text
    }
    return { kind: "failed", reason: classifyExportFailure(text) };
  }
  if (!res.body) return { kind: "failed", reason: "export_failed" };

  const reader = res.body.getReader();
  try {
    const first: Uint8Array[] = [];
    let have = 0;
    while (have < EXPORT_HEAD_BYTES) {
      const { done, value } = await reader.read();
      if (done) break;
      first.push(value);
      have += value.byteLength;
    }
    const head = classifyExportHead(concat(first));
    if (head === "rejection") {
      await reader.cancel();
      return { kind: "rejection" };
    }
    if (head === "unknown") {
      await reader.cancel();
      return { kind: "failed", reason: "export_unreadable" };
    }

    const gzip = createGzip({ level: 1 });
    const out: Uint8Array[] = [];
    gzip.on("data", (chunk: Uint8Array) => out.push(chunk));
    const finished = new Promise<void>((resolve, reject) => {
      gzip.on("end", resolve);
      gzip.on("error", reject);
    });
    const write = (chunk: Uint8Array) =>
      gzip.write(chunk) ? Promise.resolve() : new Promise<void>((resolve) => gzip.once("drain", resolve));

    // The export's own `fingerprint` key, read while the bytes pass (a restore compares against it).
    // Only a restore asks for it: a backup run does not pay for the scan.
    const scanner = opts.scanFingerprint ? new FingerprintScanner() : null;
    for (const chunk of first) {
      scanner?.push(chunk);
      await write(chunk);
    }
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      scanner?.push(value);
      await write(value);
    }
    gzip.end();
    await finished;
    const scan = scanner?.result();
    return { kind: "ok", body: concat(out), fingerprint: scan?.kind === "ok" ? scan.fingerprint : null };
  } catch {
    try {
      await reader.cancel();
    } catch {
      // already closed
    }
    return { kind: "failed", reason: "export_failed" };
  }
}
