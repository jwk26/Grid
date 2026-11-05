import { backupObjectKey } from "../_shared/object-key.ts";

// Task 255: a minimal handler that proves the toolchain. The real
// authentication and the backup itself arrive in Tasks 257 and later.
Deno.serve((req: Request) => {
  const secret = Deno.env.get("BACKUP_SHARED_SECRET");
  if (!secret || req.headers.get("x-backup-secret") !== secret) {
    return new Response("unauthorized", { status: 401 });
  }
  const userId = new URL(req.url).searchParams.get("user") ?? "";
  try {
    return Response.json({ key: backupObjectKey(userId, new Date()) });
  } catch {
    return new Response("bad request", { status: 400 });
  }
});
