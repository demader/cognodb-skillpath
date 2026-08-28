import { NextRequest } from "next/server";
import { jsonError, withErrorHandling } from "@/lib/api-helpers";
import { getPathToRole, getPathToSkill } from "@/lib/queries";

/**
 * Generates a learning path toward either a target Role or a single target Skill.
 * Body: { targetType: "role" | "skill", target: string, known: string[], includeNiceToHave?: boolean }
 */
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);

  const target = body?.target;
  const targetType = body?.targetType === "role" ? "role" : "skill";
  const known: string[] = Array.isArray(body?.known)
    ? body.known.filter((s: unknown): s is string => typeof s === "string")
    : [];
  const includeNiceToHave = Boolean(body?.includeNiceToHave);

  if (typeof target !== "string" || target.trim() === "") {
    return jsonError("A target role or skill is required.", 400);
  }

  return withErrorHandling(() =>
    targetType === "role"
      ? getPathToRole(target, known, includeNiceToHave)
      : getPathToSkill(target, known)
  );
}
