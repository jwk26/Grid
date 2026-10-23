"use client";

import { notFound } from "next/navigation";
import { useEffect, useState, useSyncExternalStore } from "react";
import { GRID_COLS, GRID_ROWS } from "@/lib/constants";
import { SnapshotStore, type WriteOutcome } from "@/lib/db/snapshot-store";
import { getSupabaseClient } from "@/lib/db/supabase-client";
import { callEnsureAccount, callUpdateNode, fetchSnapshotValue } from "@/lib/db/supabase-calls";

// Development-only end-to-end slice (SPEC Environments And Hosting, development switch; Task
// 217). Not a product route: it returns 404 outside development or with the switch off, and
// Phase 46 removes it. Plain markup on purpose.

const ENABLED =
  process.env.NODE_ENV === "development" && process.env.NEXT_PUBLIC_GRIDDO_SUPABASE_SLICE === "1";

export default function SupabaseSlicePage() {
  if (!ENABLED) notFound();
  return <SliceView />;
}

type Boot = { phase: "starting" | "ready" | "failed"; detail: string; userId?: string; anonymous?: boolean };

// One sign-in and one ensure_account per page load, even when React runs the effect twice.
let bootPromise: Promise<{ userId: string; anonymous: boolean }> | null = null;

function boot() {
  bootPromise ??= (async () => {
    const client = getSupabaseClient();
    const { data } = await client.auth.getSession();
    let user = data.session?.user;
    if (!user) {
      const signedIn = await client.auth.signInAnonymously();
      if (signedIn.error || !signedIn.data.user) {
        throw new Error(`anonymous sign-in failed: ${signedIn.error?.message ?? "no user"}`);
      }
      user = signedIn.data.user;
    }
    const ensured = await callEnsureAccount(client);
    if (ensured.status !== "applied") {
      throw new Error(`ensure_account: ${ensured.status} ${ensured.rejection?.code ?? ""}`);
    }
    return { userId: user.id, anonymous: Boolean(user.is_anonymous) };
  })().catch((error) => {
    bootPromise = null;
    throw error;
  });
  return bootPromise;
}

function describe(outcome: WriteOutcome): string {
  switch (outcome.outcome) {
    case "applied":
      return "applied";
    case "rejected":
      return `rolled back (rejected: ${outcome.envelope?.rejection?.code ?? outcome.envelope?.status})`;
    case "error":
      return `rolled back (error: ${outcome.error instanceof Error ? outcome.error.message : "unknown"})`;
    case "unknown":
      return "unknown outcome: dropped and refetched, not resent";
  }
}

function SliceView() {
  const [store] = useState(
    () => new SnapshotStore({ fetchSnapshot: () => fetchSnapshotValue(getSupabaseClient()) }),
  );
  const state = useSyncExternalStore(store.subscribe, store.getState, store.getState);
  const [boot_, setBoot] = useState<Boot>({ phase: "starting", detail: "signing in" });
  const [log, setLog] = useState<Record<string, string[]>>({});
  const addLine = (id: string, line: string) =>
    setLog((prev) => ({ ...prev, [id]: [...(prev[id] ?? []), line].slice(-6) }));

  useEffect(() => {
    let cancelled = false;
    boot()
      .then(async (account) => {
        if (cancelled) return;
        setBoot({ phase: "ready", detail: "account prepared", ...account });
        await store.load();
      })
      .catch((error: unknown) => {
        if (!cancelled) setBoot({ phase: "failed", detail: error instanceof Error ? error.message : String(error) });
      });
    return () => {
      cancelled = true;
    };
  }, [store]);

  // The snapshot is refetched when the tab becomes visible or focused (SPEC Decision 19).
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible" && store.getState().status.phase === "ready") {
        void store.refetch();
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, [store]);

  const nodes = [...state.view.nodes.values()]
    .filter(
      (node) =>
        node.parentId === null && node.deletedAt === null && node.archivedAt === null && !node.hiddenFromGrid,
    )
    .sort((a, b) => a.y - b.y || a.x - b.x);

  function move(id: string, dx: number, dy: number, absolute?: { x: number; y: number }) {
    // The position is read from the view, so a second quick move starts where the first one shows.
    const current = store.getState().view.nodes.get(id);
    if (!current) return;
    const x = absolute ? absolute.x : Math.min(GRID_COLS - 1, Math.max(0, current.x + dx));
    const y = absolute ? absolute.y : Math.min(GRID_ROWS - 1, Math.max(0, current.y + dy));
    if (x === current.x && y === current.y) return;
    addLine(id, `move to ${x},${y}: sent`);
    void store
      .write({
        effect: { kind: "patch", table: "nodes", id, patch: { x, y } },
        send: () => callUpdateNode(getSupabaseClient(), id, { x, y }),
      })
      .then((outcome) => addLine(id, `move to ${x},${y}: ${describe(outcome)}`));
  }

  const pendingFor = (id: string) => state.pending.filter((p) => p.recordId === id).map((p) => p.state);

  return (
    <main className="mx-auto max-w-3xl space-y-4 p-6 font-mono text-sm">
      <h1 className="text-lg font-bold">Supabase slice (development only)</h1>
      <p>
        Boot: {boot_.phase} — {boot_.detail}
        {boot_.userId ? ` — user ${boot_.userId.slice(0, 8)}${boot_.anonymous ? " (anonymous)" : ""}` : ""}
      </p>
      <p>
        Snapshot: {state.status.phase}
        {state.status.phase === "rejected" ? ` (${state.status.code})` : ""} — {nodes.length} L0 Node(s) —
        pending writes: {state.pending.length}
      </p>
      <button className="rounded border px-2 py-1" onClick={() => void store.refetch()}>
        Refetch
      </button>

      <ul className="space-y-3">
        {nodes.map((node, index) => {
          const next = nodes[(index + 1) % nodes.length];
          const pending = pendingFor(node.id);
          return (
            <li key={node.id} className="rounded border p-3" data-testid={`node-${node.title}`}>
              <div className="flex flex-wrap items-center gap-3">
                <strong>{node.title}</strong>
                <span data-testid="cell">
                  cell {node.x},{node.y}
                </span>
                <span>v{node.version}</span>
                {pending.length > 0 && (
                  <span data-testid="pending" className="rounded bg-yellow-200 px-1 text-black">
                    pending ({pending.join(", ")})
                  </span>
                )}
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                <button className="rounded border px-2" onClick={() => move(node.id, -1, 0)}>
                  ←
                </button>
                <button className="rounded border px-2" onClick={() => move(node.id, 1, 0)}>
                  →
                </button>
                <button className="rounded border px-2" onClick={() => move(node.id, 0, -1)}>
                  ↑
                </button>
                <button className="rounded border px-2" onClick={() => move(node.id, 0, 1)}>
                  ↓
                </button>
                <button
                  className="rounded border px-2"
                  onClick={() => {
                    move(node.id, 1, 0);
                    move(node.id, 1, 0);
                  }}
                >
                  → twice, quickly
                </button>
                {next && next.id !== node.id && (
                  <button
                    className="rounded border px-2"
                    onClick={() => move(node.id, 0, 0, { x: next.x, y: next.y })}
                  >
                    onto {next.title}&apos;s cell (should roll back)
                  </button>
                )}
              </div>
              <ul className="mt-2" data-testid="log">
                {(log[node.id] ?? ["no move yet"]).map((line, i) => (
                  <li key={i}>{line}</li>
                ))}
              </ul>
            </li>
          );
        })}
      </ul>
    </main>
  );
}
