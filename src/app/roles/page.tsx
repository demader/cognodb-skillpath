import Link from "next/link";
import { getRoles } from "@/lib/queries";
import { DatabaseUnavailableError } from "@/lib/neo4j";
import { ErrorState, EmptyState } from "@/components/StateViews";

export const dynamic = "force-dynamic";

export default async function RolesPage() {
  let roles: Awaited<ReturnType<typeof getRoles>> = [];
  let dbError: string | null = null;

  try {
    roles = await getRoles();
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

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-bold tracking-tight">Target roles</h1>
      <p className="mt-1 max-w-2xl text-sm text-gray-500 dark:text-gray-400">
        Each role is a node connected to the skills it needs. Open one to see exactly which skills
        you&apos;re missing and the shortest route to them.
      </p>

      <div className="mt-8">
        {roles.length === 0 ? (
          <EmptyState
            title="No roles found"
            description="Run npm run seed to load the sample graph into your CognoDB instance."
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {roles.map((role) => (
              <Link
                key={role.title}
                href={`/roles/${encodeURIComponent(role.title)}`}
                className="group flex flex-col rounded-xl border border-gray-200 bg-white p-5 transition-shadow hover:shadow-md dark:border-white/10 dark:bg-white/5"
              >
                <h2 className="font-semibold leading-snug group-hover:text-indigo-700 dark:group-hover:text-indigo-300">
                  {role.title}
                </h2>
                <p className="mt-2 flex-1 text-sm text-gray-500 dark:text-gray-400">
                  {role.description}
                </p>
                <p className="mt-4 text-xs font-medium text-indigo-600">
                  {role.coreSkills} core skills →
                </p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
