import { NextResponse } from "next/server";
import { DatabaseUnavailableError } from "./neo4j";

export function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

/** An error carrying the HTTP status it should be reported as. */
function statusOf(err: unknown): number | null {
  const status = (err as { status?: unknown })?.status;
  return typeof status === "number" ? status : null;
}

/**
 * Wraps a route handler so a CognoDB outage becomes a clean 503, a handler that
 * threw with a `status` becomes that status, and anything else is a logged 500.
 */
export async function withErrorHandling<T>(fn: () => Promise<T>): Promise<NextResponse> {
  try {
    const data = await fn();
    return NextResponse.json(data);
  } catch (err) {
    if (err instanceof DatabaseUnavailableError) {
      return jsonError(err.message, 503);
    }
    const status = statusOf(err);
    if (status) {
      return jsonError(err instanceof Error ? err.message : "Request failed.", status);
    }
    // A genuine defect — log it rather than disguising it as an outage.
    console.error(err);
    return jsonError("Something went wrong.", 500);
  }
}
