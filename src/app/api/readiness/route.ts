import { NextRequest } from "next/server";
import { withErrorHandling } from "@/lib/api-helpers";
import { getRoleReadiness } from "@/lib/queries";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const known: string[] = Array.isArray(body?.known)
    ? body.known.filter((s: unknown): s is string => typeof s === "string")
    : [];

  return withErrorHandling(() => getRoleReadiness(known));
}
