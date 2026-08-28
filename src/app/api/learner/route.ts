import { NextRequest } from "next/server";
import { jsonError, withErrorHandling } from "@/lib/api-helpers";
import { getKnownSkillNames, getTargetRole } from "@/lib/queries";

export async function GET(request: NextRequest) {
  const email = request.nextUrl.searchParams.get("email");
  if (!email) return jsonError("An email query parameter is required.", 400);

  return withErrorHandling(async () => {
    const [knownSkills, targetRole] = await Promise.all([
      getKnownSkillNames(email),
      getTargetRole(email),
    ]);
    return { email, knownSkills, targetRole };
  });
}
