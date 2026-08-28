import { NextRequest } from "next/server";
import { jsonError, withErrorHandling } from "@/lib/api-helpers";
import { getLearningPath } from "@/lib/queries";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const target = body?.target;
  const known = Array.isArray(body?.known) ? body.known : [];

  if (typeof target !== "string" || target.trim() === "") {
    return jsonError("A target skill name is required.", 400);
  }

  return withErrorHandling(() => getLearningPath(target, known));
}
