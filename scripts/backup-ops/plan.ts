// Task 264: the pure part of `copy-account.mjs` (DECISION §Object key). No network, no secrets.
//
// After a recovery into a new project the internal user id changes. The old prefix is found by the
// provider user id (the `identity.json` files in the source bucket), and the dated backup files are
// copied to `accounts/<new id>/`. Every rule that protects a bucket lives here, so a test can break it.
import { accountPrefix, parseBackupKey, parsePreRestoreKey } from "../../supabase/functions/_shared/object-key.ts";

export type ProviderIdentity = { provider: string; id: string };
export type IdentityObject = { key: string; text: string };
export type KeyPair = { from: string; to: string };

const IDENTITY_KEY = /^accounts\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\/identity\.json$/;

/**
 * The user ids (old prefixes) whose `identity.json` holds one of `wanted` (provider and provider user id
 * both equal). The file's own `user_id` must equal the one in its key, `newUserId` is never a candidate,
 * and an unreadable file matches nothing. Sorted and unique.
 */
export function findOldOwners(wanted: ProviderIdentity[], files: IdentityObject[], newUserId: string): string[] {
  const owners = new Set<string>();
  for (const f of files) {
    const m = IDENTITY_KEY.exec(f.key);
    if (!m || m[1] === newUserId) continue;
    try {
      const parsed = JSON.parse(f.text) as { user_id?: unknown; providers?: unknown } | null;
      if (!parsed || parsed.user_id !== m[1] || !Array.isArray(parsed.providers)) continue;
      const hit = parsed.providers.some((p: { provider?: unknown; provider_user_id?: unknown }) =>
        wanted.some((w) => p?.provider === w.provider && p?.provider_user_id === w.id),
      );
      if (hit) owners.add(m[1]);
    } catch {
      // unreadable: matches nothing
    }
  }
  return [...owners].sort();
}

/** Exactly one old prefix may match; the message holds the count, never an id. */
export function pickOldOwner(owners: string[]): string {
  if (owners.length !== 1) throw new Error(`expected exactly one old prefix, found ${owners.length}`);
  return owners[0];
}

/**
 * The keys to copy from the old prefix to the new one. Dated slot files always; `pre-restore/` files only
 * with `includePreRestore`; `identity.json` and every other key never. Refuses an old id equal to the new id
 * and an empty plan.
 */
export function planCopy(oldUserId: string, newUserId: string, sourceKeys: string[], includePreRestore = false): KeyPair[] {
  if (oldUserId === newUserId) throw new Error("the old and the new user id are the same prefix");
  const pairs: KeyPair[] = [];
  for (const key of sourceKeys) {
    const dated = parseBackupKey(oldUserId, key) !== null;
    const pre = includePreRestore && parsePreRestoreKey(oldUserId, key) !== null;
    if (!dated && !pre) continue;
    pairs.push({ from: key, to: `${accountPrefix(newUserId)}${key.slice(accountPrefix(oldUserId).length)}` });
  }
  if (pairs.length === 0) throw new Error("no backup file to copy under the old prefix");
  return pairs.sort((a, b) => (a.from < b.from ? -1 : 1));
}

/** The target keys of the plan that already exist: a copy never overwrites, so any one stops the run. */
export function findCollisions(plan: KeyPair[], existingTargetKeys: string[]): string[] {
  const have = new Set(existingTargetKeys);
  return plan.filter((p) => have.has(p.to)).map((p) => p.to);
}

/** True when two bucket settings name the same bucket on the same endpoint (then CopyObject is used). */
export function sameBucket(a: { endpoint: string; bucket: string }, b: { endpoint: string; bucket: string }): boolean {
  const host = (e: string) => new URL(e).host.toLowerCase();
  return host(a.endpoint) === host(b.endpoint) && a.bucket === b.bucket;
}
