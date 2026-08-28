import { NextResponse } from "next/server";
import { DatabaseUnavailableError } from "./neo4j";

export function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

/** Wraps a route handler so a CognoDB outage becomes a clean 503 instead of a 500 stack trace. */
export async function withErrorHandling<T>(fn: () => Promise<T>): Promise<NextResponse> {
  try {
    const data = await fn();
    return NextResponse.json(data);
  } catch (err) {
    if (err instanceof DatabaseUnavailableError) {
      return jsonError(err.message, 503);
    }
    console.error(err);
    return jsonError("Something went wrong.", 500);
  }
}
