import { withErrorHandling } from "@/lib/api-helpers";
import { getPrerequisiteChain, getSkillDetail } from "@/lib/queries";

export async function GET(_request: Request, { params }: { params: Promise<{ name: string }> }) {
  // Next.js has already percent-decoded the segment; decoding again would corrupt
  // a name containing a literal '%' (and throw URIError on an invalid sequence).
  const { name } = await params;

  return withErrorHandling(async () => {
    const [detail, chain] = await Promise.all([
      getSkillDetail(name),
      getPrerequisiteChain(name),
    ]);

    if (!detail) {
      throw Object.assign(new Error(`No skill named "${name}" was found.`), { status: 404 });
    }
    return { ...detail, prerequisiteChain: chain };
  });
}
