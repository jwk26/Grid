import { corsHeaders as supabaseCors } from "@supabase/supabase-js/cors";
import { describe, expect, it, vi } from "vitest";
import { SafeError } from "./safe-error.ts";
import { CORS_HEADERS, withCors, withCorsHandler } from "./cors.ts";

const post = () => new Request("https://x.test/functions/v1/backup", { method: "POST", body: "{}" });
const preflight = () =>
  new Request("https://x.test/functions/v1/backup", {
    method: "OPTIONS",
    headers: { origin: "https://app.test", "access-control-request-method": "POST" },
  });

function expectHeaders(res: Response) {
  expect(res.headers.get("access-control-allow-origin")).toBe("*");
  const allowed = res.headers.get("access-control-allow-headers") ?? "";
  for (const h of ["authorization", "apikey", "content-type", "x-client-info"]) expect(allowed).toContain(h);
}

describe("CORS", () => {
  it("answers the preflight 204 without calling the handler", async () => {
    const inner = vi.fn(() => Promise.resolve(new Response("no")));
    const res = await withCorsHandler(inner)(preflight());
    expect(res.status).toBe(204);
    expectHeaders(res);
    expect(inner).not.toHaveBeenCalled();
  });
  it.each([200, 400, 401, 403, 405, 502])("adds the headers to a %i answer and keeps status and body", async (status) => {
    const res = await withCorsHandler(() => Promise.resolve(Response.json({ a: 1 }, { status })))(post());
    expect(res.status).toBe(status);
    expect(await res.json()).toEqual({ a: 1 });
    expectHeaders(res);
    expect(res.headers.get("content-type")).toContain("application/json");
  });
  it("answers an escaped exception as unconfirmed, with the headers and no message", async () => {
    const res = await withCorsHandler(() => Promise.reject(new Error("secret detail")))(post());
    expect(res.status).toBe(502);
    expectHeaders(res);
    expect(JSON.stringify(await res.json())).not.toContain("secret");
  });
  it("logs the code of an escaped exception, never its message", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      await withCorsHandler(() => Promise.reject(new SafeError("auth_x")))(post());
      await withCorsHandler(() => Promise.reject(new Error("secret detail")))(post());
      const lines = spy.mock.calls.map((c) => String(c[0]));
      expect(lines[0]).toBe("request failed: auth_x");
      expect(lines.join("\n")).not.toContain("secret detail");
    } finally {
      spy.mockRestore();
    }
  });
  it("allows every header the installed supabase-js allows (the local gateway would hide a gap)", () => {
    const names = (v: string) => v.split(",").map((h) => h.trim().toLowerCase());
    const ours = names(CORS_HEADERS["Access-Control-Allow-Headers"]);
    for (const h of names(supabaseCors["Access-Control-Allow-Headers"])) expect(ours).toContain(h);
  });
  it("names the three headers", () => {
    expect(Object.keys(CORS_HEADERS)).toContain("Access-Control-Allow-Origin");
    expect(withCors(new Response("x")).headers.get("access-control-allow-methods")).toContain("OPTIONS");
  });
});
