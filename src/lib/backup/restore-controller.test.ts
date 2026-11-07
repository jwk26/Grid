import { afterEach, describe, expect, it, vi } from "vitest";
import type { RestoreOutcome, RestoreRequest } from "@/lib/backup/backup-client";
import { BackupSlot } from "@/lib/backup/backup-slot";
import type { RestoreChannel, RestoreMessage } from "@/lib/backup/restore-channel";
import { createRestoreController } from "@/lib/backup/restore-controller";
import { EDGE_REQUEST_TIMEOUT_MS } from "@/lib/constants";

const U = "user-1";
type Verdict = { kind: "ok"; verdict: string | null } | { kind: "failed" };

function setup(opts: { userId?: string | null } = {}) {
  const calls: string[] = [];
  let restoreImpl: (r: RestoreRequest) => Promise<RestoreOutcome> = async () => ({ kind: "applied" });
  const ensureFreshSession = vi.fn(async () => {
    calls.push("refresh");
    return { ok: true as const, userId: U };
  });
  const restore = vi.fn(async (r: RestoreRequest) => {
    calls.push("send");
    return restoreImpl(r);
  });
  const readRestoreVerdict = vi.fn<(id: string) => Promise<Verdict>>(async () => ({ kind: "ok", verdict: "applied" }));
  const posted: RestoreMessage[] = [];
  let listener: ((m: RestoreMessage) => void) | null = null;
  const channel: RestoreChannel = {
    post: (m) => {
      calls.push(`post:${m.type}`);
      posted.push(m);
    },
    subscribe: (l) => {
      listener = l;
      return () => undefined;
    },
  };
  const slot = new BackupSlot({ now: () => 0 });
  const reenter = vi.fn();
  const refreshList = vi.fn(async () => undefined);
  const controller = createRestoreController({
    client: { ensureFreshSession, restore, readRestoreVerdict },
    slot,
    channel,
    getUserId: () => (opts.userId === undefined ? U : opts.userId),
    reenter,
    refreshList,
    newRestoreId: () => "rid-1",
  });
  return {
    controller,
    calls,
    posted,
    slot,
    reenter,
    refreshList,
    restore,
    readRestoreVerdict,
    ensureFreshSession,
    onRestore: (impl: typeof restoreImpl) => (restoreImpl = impl),
    receive: (m: RestoreMessage) => listener?.(m),
  };
}

afterEach(() => vi.useRealTimers());

describe("this tab's restore", () => {
  it("refreshes the session, posts restore-started, then sends, in that order", async () => {
    const t = setup();
    await t.controller.start("2026-11-07", "e1");
    expect(t.calls).toEqual(["refresh", "post:restore-started", "send", "post:restore-ended"]);
    expect(t.restore.mock.calls[0][0]).toMatchObject({ restoreId: "rid-1", file: "2026-11-07", etag: "e1" });
    expect(t.posted[0]).toEqual({ type: "restore-started", restoreId: "rid-1", userId: U });
  });

  it("shows the steps as the stream reaches them, never going back", async () => {
    const t = setup();
    let finish!: (o: RestoreOutcome) => void;
    t.onRestore((r) => {
      r.onStep("saving");
      r.onStep("applying");
      r.onStep("getting");
      return new Promise((resolve) => (finish = resolve));
    });
    const running = t.controller.start("2026-11-07", "e1");
    await vi.waitFor(() => expect(t.controller.getState().view).toMatchObject({ phase: "restoring", role: "self", step: "applying" }));
    finish({ kind: "applied" });
    await running;
  });

  it("applied: posts restore-ended applied, drops the snapshot by re-entering, and ends the screen", async () => {
    const t = setup();
    await t.controller.start("2026-11-07", "e1");
    expect(t.posted[1]).toEqual({ type: "restore-ended", restoreId: "rid-1", userId: U, outcome: "applied" });
    expect(t.reenter).toHaveBeenCalledTimes(1);
    expect(t.controller.getState()).toEqual({ view: { phase: "idle" }, notice: null });
  });

  it.each(["account_changed", "unsupported_format", "rate_limited", "not_applied"] as const)(
    "%s returns to the dialog with its line, posts not applied, reads the list again and re-enters nothing",
    async (kind) => {
      const t = setup();
      t.onRestore(async () => ({ kind }));
      await t.controller.start("2026-11-07", "e1");
      expect(t.controller.getState()).toEqual({ view: { phase: "idle" }, notice: kind });
      expect(t.posted[1]).toMatchObject({ type: "restore-ended", outcome: "not_applied" });
      expect(t.refreshList).toHaveBeenCalledTimes(1);
      expect(t.reenter).not.toHaveBeenCalled();
    },
  );

  it("a failed session refresh sends nothing and posts nothing", async () => {
    const t = setup();
    t.ensureFreshSession.mockResolvedValueOnce({ ok: false } as never);
    await t.controller.start("2026-11-07", "e1");
    expect(t.restore).not.toHaveBeenCalled();
    expect(t.posted).toEqual([]);
    expect(t.controller.getState()).toEqual({ view: { phase: "idle" }, notice: "not_applied" });
  });

  it("a second start while one runs does nothing", async () => {
    const t = setup();
    t.onRestore(() => new Promise(() => undefined));
    void t.controller.start("a", "e");
    await t.controller.start("b", "e");
    expect(t.ensureFreshSession).toHaveBeenCalledTimes(1);
  });

  it("clearNotice removes the line", async () => {
    const t = setup();
    t.onRestore(async () => ({ kind: "not_applied" }));
    await t.controller.start("a", "e");
    t.controller.clearNotice();
    expect(t.controller.getState().notice).toBeNull();
  });
});

describe("an unknown outcome", () => {
  const unknown = (t: ReturnType<typeof setup>) => t.onRestore(async () => ({ kind: "unknown" }));

  it("reads the verdict for the restore id once, and never resends", async () => {
    const t = setup();
    unknown(t);
    t.readRestoreVerdict.mockResolvedValue({ kind: "ok", verdict: "finishing" });
    await t.controller.start("a", "e");
    expect(t.readRestoreVerdict).toHaveBeenCalledTimes(1);
    expect(t.readRestoreVerdict).toHaveBeenCalledWith("rid-1");
    expect(t.restore).toHaveBeenCalledTimes(1);
    expect(t.controller.getState().view).toEqual({ phase: "wayout", role: "self", restoreId: "rid-1", reading: false, readFailed: false });
    expect(t.posted.map((m) => m.type)).toEqual(["restore-started"]);
  });

  it("Check again is one more read; applied then re-enters and tells the other tabs", async () => {
    const t = setup();
    unknown(t);
    t.readRestoreVerdict.mockResolvedValueOnce({ kind: "ok", verdict: "finishing" });
    await t.controller.start("a", "e");
    t.readRestoreVerdict.mockResolvedValueOnce({ kind: "ok", verdict: "applied" });
    await t.controller.checkAgain();
    expect(t.readRestoreVerdict).toHaveBeenCalledTimes(2);
    expect(t.reenter).toHaveBeenCalledTimes(1);
    expect(t.posted[1]).toMatchObject({ type: "restore-ended", outcome: "applied" });
    expect(t.restore).toHaveBeenCalledTimes(1);
  });

  it("expired re-enters (a sleeping laptop), never the not-applied line", async () => {
    const t = setup();
    unknown(t);
    t.readRestoreVerdict.mockResolvedValue({ kind: "ok", verdict: "expired" });
    await t.controller.start("a", "e");
    expect(t.reenter).toHaveBeenCalledTimes(1);
    expect(t.controller.getState().notice).toBeNull();
  });

  it.each([
    ["not_applied", "not_applied"],
    ["not_started", "not_applied"],
    ["account_changed", "account_changed"],
    ["unsupported_format", "unsupported_format"],
    [null, "not_applied"],
  ] as const)("verdict %s returns to the dialog as %s", async (verdict, notice) => {
    const t = setup();
    unknown(t);
    t.readRestoreVerdict.mockResolvedValue({ kind: "ok", verdict });
    await t.controller.start("a", "e");
    expect(t.controller.getState()).toEqual({ view: { phase: "idle" }, notice });
    expect(t.reenter).not.toHaveBeenCalled();
    expect(t.refreshList).toHaveBeenCalledTimes(1);
  });

  it("a failed read keeps the way out with Check again, and no verdict is inferred", async () => {
    const t = setup();
    unknown(t);
    t.readRestoreVerdict.mockResolvedValue({ kind: "failed" });
    await t.controller.start("a", "e");
    expect(t.controller.getState().view).toMatchObject({ phase: "wayout", readFailed: true, reading: false });
    expect(t.reenter).not.toHaveBeenCalled();
  });

  it("Check again while a read is in flight does nothing", async () => {
    const t = setup();
    unknown(t);
    t.readRestoreVerdict.mockResolvedValueOnce({ kind: "ok", verdict: "finishing" });
    await t.controller.start("a", "e");
    let finish!: (v: Verdict) => void;
    t.readRestoreVerdict.mockImplementationOnce(() => new Promise((r) => (finish = r)));
    const first = t.controller.checkAgain();
    await t.controller.checkAgain();
    expect(t.readRestoreVerdict).toHaveBeenCalledTimes(2);
    finish({ kind: "ok", verdict: "finishing" });
    await first;
  });

  it("a verdict that arrives after a sign-out is ignored", async () => {
    const t = setup();
    unknown(t);
    let finish!: (v: Verdict) => void;
    t.readRestoreVerdict.mockImplementationOnce(() => new Promise((r) => (finish = r)));
    const running = t.controller.start("a", "e");
    await vi.waitFor(() => expect(t.readRestoreVerdict).toHaveBeenCalled());
    t.slot.reset();
    finish({ kind: "ok", verdict: "applied" });
    await running;
    expect(t.reenter).not.toHaveBeenCalled();
    expect(t.controller.getState()).toEqual({ view: { phase: "idle" }, notice: null });
  });
});

describe("another tab of the browser", () => {
  const started = (id = "rid-9", userId = U): RestoreMessage => ({ type: "restore-started", restoreId: id, userId });
  const ended = (outcome: "applied" | "not_applied", id = "rid-9", userId = U): RestoreMessage => ({ type: "restore-ended", restoreId: id, userId, outcome });

  it("blocks on restore-started, re-enters on restore-ended applied", () => {
    const t = setup();
    t.receive(started());
    expect(t.controller.getState().view).toEqual({ phase: "restoring", role: "other", restoreId: "rid-9" });
    t.receive(ended("applied"));
    expect(t.reenter).toHaveBeenCalledTimes(1);
    expect(t.controller.getState().view).toEqual({ phase: "idle" });
  });

  it("unblocks with nothing changed on any other outcome", () => {
    const t = setup();
    t.receive(started());
    t.receive(ended("not_applied"));
    expect(t.reenter).not.toHaveBeenCalled();
    expect(t.controller.getState()).toEqual({ view: { phase: "idle" }, notice: null });
  });

  it("ignores another user's messages, and every message while the user is unknown", () => {
    const t = setup();
    t.receive(started("x", "someone-else"));
    t.receive(ended("applied", "x", "someone-else"));
    expect(t.controller.getState().view).toEqual({ phase: "idle" });
    expect(t.reenter).not.toHaveBeenCalled();
    const unknownUser = setup({ userId: null });
    unknownUser.receive(started());
    expect(unknownUser.controller.getState().view).toEqual({ phase: "idle" });
  });

  it("an applied restore-ended it never saw re-enters (a tab opened mid-restore)", () => {
    const t = setup();
    t.receive(ended("applied", "unseen"));
    expect(t.reenter).toHaveBeenCalledTimes(1);
    const notApplied = setup();
    notApplied.receive(ended("not_applied", "unseen"));
    expect(notApplied.reenter).not.toHaveBeenCalled();
  });

  it("reads the verdict once after EDGE_REQUEST_TIMEOUT_MS with no restore-ended", async () => {
    vi.useFakeTimers();
    const t = setup();
    t.readRestoreVerdict.mockResolvedValue({ kind: "ok", verdict: "finishing" });
    t.receive(started());
    await vi.advanceTimersByTimeAsync(EDGE_REQUEST_TIMEOUT_MS - 1);
    expect(t.readRestoreVerdict).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(t.readRestoreVerdict).toHaveBeenCalledTimes(1);
    expect(t.readRestoreVerdict).toHaveBeenCalledWith("rid-9");
    expect(t.controller.getState().view).toMatchObject({ phase: "wayout", role: "other", reading: false });
    await vi.advanceTimersByTimeAsync(EDGE_REQUEST_TIMEOUT_MS * 3);
    expect(t.readRestoreVerdict).toHaveBeenCalledTimes(1);
  });

  it("the way-out: applied or expired re-enters; anything else just unblocks", async () => {
    vi.useFakeTimers();
    for (const [verdict, reenters] of [["applied", 1], ["expired", 1], ["not_applied", 0], ["not_started", 0]] as const) {
      const t = setup();
      t.readRestoreVerdict.mockResolvedValue({ kind: "ok", verdict });
      t.receive(started());
      await vi.advanceTimersByTimeAsync(EDGE_REQUEST_TIMEOUT_MS);
      expect(t.reenter).toHaveBeenCalledTimes(reenters);
      expect(t.controller.getState()).toEqual({ view: { phase: "idle" }, notice: null });
    }
  });

  it("a restore-ended before the timer cancels it", async () => {
    vi.useFakeTimers();
    const t = setup();
    t.receive(started());
    t.receive(ended("not_applied"));
    await vi.advanceTimersByTimeAsync(EDGE_REQUEST_TIMEOUT_MS * 2);
    expect(t.readRestoreVerdict).not.toHaveBeenCalled();
  });

  it("a tab running its own restore ignores the channel", async () => {
    const t = setup();
    t.onRestore(() => new Promise(() => undefined));
    void t.controller.start("a", "e");
    await vi.waitFor(() => expect(t.restore).toHaveBeenCalled());
    t.receive(started());
    t.receive(ended("applied", "rid-1"));
    expect(t.controller.getState().view).toMatchObject({ phase: "restoring", role: "self", restoreId: "rid-1" });
    expect(t.reenter).not.toHaveBeenCalled();
  });

  it("a sign-out drops the block and its timer", async () => {
    vi.useFakeTimers();
    const t = setup();
    t.receive(started());
    t.slot.reset();
    expect(t.controller.getState().view).toEqual({ phase: "idle" });
    await vi.advanceTimersByTimeAsync(EDGE_REQUEST_TIMEOUT_MS);
    expect(t.readRestoreVerdict).not.toHaveBeenCalled();
  });
});
