import { withErrorHandling } from "@/lib/api-helpers";
import { getCategories } from "@/lib/queries";

export async function GET() {
  return withErrorHandling(() => getCategories());
}
