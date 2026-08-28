import { NextRequest } from "next/server";
import { withErrorHandling } from "@/lib/api-helpers";
import { getSkills } from "@/lib/queries";

export async function GET(request: NextRequest) {
  const category = request.nextUrl.searchParams.get("category") ?? undefined;
  return withErrorHandling(() => getSkills(category));
}
