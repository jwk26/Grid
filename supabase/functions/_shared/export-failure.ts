// A non-2xx answer of the export call: PostgREST reports a statement cut at the 30 s limit with the
// Postgres error code 57014 (query_canceled). That is `export_timeout`; anything else `export_failed`.

export function classifyExportFailure(bodyText: string): "export_timeout" | "export_failed" {
  try {
    const parsed: unknown = JSON.parse(bodyText);
    if (typeof parsed === "object" && parsed !== null && (parsed as Record<string, unknown>).code === "57014") {
      return "export_timeout";
    }
  } catch {
    // not JSON: a gateway or network answer
  }
  return "export_failed";
}
