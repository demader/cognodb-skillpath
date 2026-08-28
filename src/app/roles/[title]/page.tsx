import Link from "next/link";
import { notFound } from "next/navigation";
import { getRoleNeeds, getRoles } from "@/lib/queries";
import { DatabaseUnavailableError } from "@/lib/neo4j";
import { ErrorState } from "@/components/StateViews";
import { RolePathPanel } from "@/components/RolePathPanel";

export const dynamic = "force-dynamic";

export default async function RoleDetailPage({ params }: PageProps<"/roles/[title]">) {
  const { title: rawTitle } = await params;
  const title = decodeURIComponent(rawTitle);

  let needs: Awaited<ReturnType<typeof getRoleNeeds>> = null;
  let roles: Awaited<ReturnType<typeof getRoles>> = [];
  let dbError: string | null = null;

  try {
    [needs, roles] = await Promise.all([getRoleNeeds(title), getRoles()]);
  } catch (err) {
    if (err instanceof DatabaseUnavailableError) dbError = err.message;
    else throw err;
  }

  if (dbError) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-24">
        <ErrorState message={dbError} />
      </div>
    );
  }
  if (!needs) notFound();

  const role = roles.find((r) => r.title === title);

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <Link href="/roles" className="text-sm text-indigo-600 hover:underline">
        ← All roles
      </Link>

      <h1 className="mt-3 text-2xl font-bold tracking-tight">{title}</h1>
      {role?.description && (
        <p className="mt-2 max-w-2xl text-gray-600 dark:text-gray-400">{role.description}</p>
      )}

      <RolePathPanel role={title} needs={needs} />
    </div>
  );
}
