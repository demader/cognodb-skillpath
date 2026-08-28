import { NextRequest } from "next/server";
import { jsonError, withErrorHandling } from "@/lib/api-helpers";
import { getTargetRole, setTargetRole } from "@/lib/queries";

/** Sets (or clears, with roleTitle: null) the learner's TARGETS relationship. */
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const email = body?.email;
  const learnerName =
    typeof body?.name === "string" && body.name.trim() ? body.name.trim() : "Anonymous learner";
  const roleTitle = body?.roleTitle ?? null;

  if (typeof email !== "string" || !email.includes("@")) {
    return jsonError("A valid email is required.", 400);
  }
  if (roleTitle !== null && typeof roleTitle !== "string") {
    return jsonError("roleTitle must be a string or null.", 400);
  }

  return withErrorHandling(async () => {
    await setTargetRole(email, learnerName, roleTitle);
    return { email, targetRole: await getTargetRole(email) };
  });
}
