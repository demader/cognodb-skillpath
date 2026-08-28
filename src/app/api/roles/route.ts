import { withErrorHandling } from "@/lib/api-helpers";
import { getRoles } from "@/lib/queries";

export async function GET() {
  return withErrorHandling(() => getRoles());
}
