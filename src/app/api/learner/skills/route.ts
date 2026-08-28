import { NextRequest } from "next/server";
import { jsonError, withErrorHandling } from "@/lib/api-helpers";
import { getKnownSkillNames, getOrCreateLearner, setSkillKnown } from "@/lib/queries";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const email = body?.email;
  const name = typeof body?.name === "string" && body.name.trim() ? body.name : "Anonymous learner";
  const skillName = body?.skillName;
  const known = Boolean(body?.known);

  if (typeof email !== "string" || !email.includes("@")) {
    return jsonError("A valid email is required.", 400);
  }
  if (typeof skillName !== "string" || skillName.trim() === "") {
    return jsonError("A skillName is required.", 400);
  }

  return withErrorHandling(async () => {
    await getOrCreateLearner(email, name);
    await setSkillKnown(email, skillName, known);
    return { email, knownSkills: await getKnownSkillNames(email) };
  });
}
