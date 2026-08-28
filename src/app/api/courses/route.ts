import { withErrorHandling } from "@/lib/api-helpers";
import { getAllCourses } from "@/lib/queries";

export async function GET() {
  return withErrorHandling(() => getAllCourses());
}
