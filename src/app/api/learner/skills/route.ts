import { NextRequest } from "next/server";
import { jsonError, withErrorHandling } from "@/lib/api-helpers";
import { getKnownSkillNames, setSkillKnown } from "@/lib/queries";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const email = body?.email;
  const learnerName =
    typeof body?.name === "string" && body.name.trim() ? body.name.trim() : "Anonymous learner";
  const skillName = body?.skillName;
  const known = Boolean(body?.known);

  if (typeof email !== "string" || !email.includes("@")) {
    return jsonError("A valid email is required.", 400);
  }
  if (typeof skillName !== "string" || skillName.trim() === "") {
    return jsonError("A skillName is required.", 400);
  }

  return withErrorHandling(async () => {
    const applied = await setSkillKnown(email, learnerName, skillName, known);
    if (!applied) {
      throw Object.assign(new Error(`No skill named "${skillName}" was found.`), { status: 404 });
    }
    return { email, knownSkills: await getKnownSkillNames(email) };
  });
}
