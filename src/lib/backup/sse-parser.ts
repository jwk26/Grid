// A minimal parser for the restore stream (SCHEMA §Account backup, Restore): `text/event-stream`
// events, each `event: <name>` and `data: <json>` lines ended by a blank line. Chunks can split
// anywhere, so it keeps what is not yet a whole event. Pure.

export type SseEvent = { event: string; data: string };

export function createSseParser() {
  let buffer = "";
  return {
    /** Feeds decoded text; returns the events completed by it. */
    push(chunk: string): SseEvent[] {
      buffer = (buffer + chunk).replace(/\r\n/g, "\n");
      const blocks = buffer.split("\n\n");
      buffer = blocks.pop() ?? "";
      const events: SseEvent[] = [];
      for (const block of blocks) {
        let event = "message";
        const data: string[] = [];
        for (const line of block.split("\n")) {
          if (line === "" || line.startsWith(":")) continue;
          const colon = line.indexOf(":");
          const field = colon < 0 ? line : line.slice(0, colon);
          let value = colon < 0 ? "" : line.slice(colon + 1);
          if (value.startsWith(" ")) value = value.slice(1);
          if (field === "event") event = value;
          else if (field === "data") data.push(value);
        }
        if (data.length > 0) events.push({ event, data: data.join("\n") });
      }
      return events;
    },
  };
}
