// A non-2xx answer of the export call: PostgREST reports a statement cut at the 30 s limit with the
// Postgres error code 57014 (query_canceled): the account is too large to export inside the limit, so
// it is recorded as `too_large` (SCHEMA Account backup; SPEC's red line has its own copy for it).
// Anything else is `export_failed`.

export function classifyExportFailure(bodyText: string): "too_large" | "export_failed" {
  try {
    const parsed: unknown = JSON.parse(bodyText);
    if (typeof parsed === "object" && parsed !== null && (parsed as Record<string, unknown>).code === "57014") {
      return "too_large";
    }
  } catch {
    // not JSON: a gateway or network answer
  }
  return "export_failed";
}
