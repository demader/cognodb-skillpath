import { NextRequest } from "next/server";
import { jsonError, withErrorHandling } from "@/lib/api-helpers";
import { getKnownSkillNames } from "@/lib/queries";

export async function GET(request: NextRequest) {
  const email = request.nextUrl.searchParams.get("email");
  if (!email) return jsonError("An email query parameter is required.", 400);

  return withErrorHandling(async () => ({ email, knownSkills: await getKnownSkillNames(email) }));
}
