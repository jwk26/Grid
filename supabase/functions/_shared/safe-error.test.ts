import { describe, expect, it } from "vitest";
import { classifyExportFailure } from "./export-failure.ts";
import { logCode, SafeError } from "./safe-error.ts";

describe("logCode", () => {
  it("logs the code of a SafeError, the name of another error, and a marker for a non-error", () => {
    expect(logCode(new SafeError("put_403"))).toBe("put_403");
    expect(logCode(new TypeError("https://secret.example/key"))).toBe("TypeError");
    expect(logCode("a string with a url")).toBe("non_error");
  });
});

describe("classifyExportFailure", () => {
  it("reads 57014 as too_large and everything else as a failure", () => {
    expect(classifyExportFailure('{"code":"57014","message":"canceling statement due to statement timeout"}')).toBe("too_large");
    expect(classifyExportFailure('{"code":"42501","message":"permission denied"}')).toBe("export_failed");
    expect(classifyExportFailure("<html>502</html>")).toBe("export_failed");
    expect(classifyExportFailure("")).toBe("export_failed");
    expect(classifyExportFailure("null")).toBe("export_failed");
  });
});
