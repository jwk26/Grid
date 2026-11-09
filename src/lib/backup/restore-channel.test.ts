import { afterEach, describe, expect, it, vi } from "vitest";
import { createRestoreChannel, type ChannelMessage } from "@/lib/backup/restore-channel";

// Two instances with one name hear each other, never themselves (BroadcastChannel).
const flush = () => new Promise((resolve) => setTimeout(resolve, 20));

describe("restore channel", () => {
  afterEach(() => vi.restoreAllMocks());

  it("delivers a deletion-cancelled message with only a user id, and drops a malformed one", async () => {
    const a = createRestoreChannel("test.channel.a");
    const b = createRestoreChannel("test.channel.a");
    const heard: ChannelMessage[] = [];
    b.subscribe((m) => heard.push(m));
    a.post({ type: "deletion-cancelled", userId: "u1" });
    a.post({ type: "deletion-cancelled", userId: 5 } as never);
    a.post({ type: "unknown", userId: "u1", restoreId: "r" } as never);
    await flush();
    expect(heard).toEqual([{ type: "deletion-cancelled", userId: "u1" }]);
  });

  it("still delivers the restore messages", async () => {
    const a = createRestoreChannel("test.channel.b");
    const b = createRestoreChannel("test.channel.b");
    const heard: ChannelMessage[] = [];
    b.subscribe((m) => heard.push(m));
    a.post({ type: "restore-started", restoreId: "r", userId: "u" });
    await flush();
    expect(heard).toEqual([{ type: "restore-started", restoreId: "r", userId: "u" }]);
  });
});
