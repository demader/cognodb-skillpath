import { NextRequest } from "next/server";
import { withErrorHandling } from "@/lib/api-helpers";
import { getRecommendedCourses } from "@/lib/queries";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const known = Array.isArray(body?.known) ? body.known : [];

  return withErrorHandling(() => getRecommendedCourses(known));
}
