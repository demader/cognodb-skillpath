import { jsonError } from "@/lib/api-helpers";
import { getPrerequisiteChain, getSkillDetail } from "@/lib/queries";
import { DatabaseUnavailableError } from "@/lib/neo4j";
import { NextResponse } from "next/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ name: string }> }
) {
  const { name: rawName } = await params;
  const name = decodeURIComponent(rawName);

  try {
    const [detail, chain] = await Promise.all([
      getSkillDetail(name),
      getPrerequisiteChain(name),
    ]);

    if (!detail) {
      return jsonError(`No skill named "${name}" was found.`, 404);
    }

    return NextResponse.json({ ...detail, prerequisiteChain: chain });
  } catch (err) {
    if (err instanceof DatabaseUnavailableError) {
      return jsonError(err.message, 503);
    }
    console.error(err);
    return jsonError("Something went wrong.", 500);
  }
}
