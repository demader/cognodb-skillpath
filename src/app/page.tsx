import Link from "next/link";
import { getCategories, getGraphStats, getRoles, getSkills } from "@/lib/queries";
import { DatabaseUnavailableError } from "@/lib/neo4j";
import { ErrorState } from "@/components/StateViews";

export const dynamic = "force-dynamic";

function loadHomeData() {
  return Promise.all([getGraphStats(), getCategories(), getSkills(), getRoles()]).then(
    ([stats, categories, skills, roles]) => ({ stats, categories, skills, roles })
  );
}

export default async function Home() {
  let data: Awaited<ReturnType<typeof loadHomeData>> | null = null;
  let dbError: string | null = null;

  try {
    data = await loadHomeData();
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

  const { stats, categories, skills, roles } = data!;

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <section className="mb-14 text-center">
        <p className="mb-3 text-sm font-medium uppercase tracking-widest text-indigo-600">
          Powered by a CognoDB graph
        </p>
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          Know where you are.
          <br />
          See how to get where you&apos;re going.
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-lg text-gray-600 dark:text-gray-400">
          SkillPath models skills, their prerequisites, the courses that teach them and the roles
          that need them as one connected graph — then walks it to build the exact sequence of
          steps between what you know today and the job you want next.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/roles"
            className="rounded-lg bg-indigo-600 px-5 py-2.5 font-medium text-white shadow-sm transition-colors hover:bg-indigo-500"
          >
            Pick a target role
          </Link>
          <Link
            href="/path"
            className="rounded-lg border border-gray-300 px-5 py-2.5 font-medium transition-colors hover:bg-gray-100 dark:border-white/20 dark:hover:bg-white/10"
          >
            Plan a path
          </Link>
        </div>
      </section>

      <section className="mb-14 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {[
          { label: "Skills", value: stats.skills },
          { label: "Courses", value: stats.courses },
          { label: "Roles", value: stats.roles },
          { label: "Providers", value: stats.providers },
          { label: "Relationships", value: stats.relationships },
          { label: "Course hours", value: stats.totalHours },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl border border-gray-200 bg-white p-5 text-center dark:border-white/10 dark:bg-white/5"
          >
            <p className="text-3xl font-bold text-indigo-600">{stat.value}</p>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{stat.label}</p>
          </div>
        ))}
      </section>

      <section className="mb-14">
        <div className="mb-4 flex items-baseline justify-between">
          <h2 className="text-xl font-semibold">Target roles</h2>
          <Link href="/roles" className="text-sm text-indigo-600 hover:underline">
            See all {roles.length} →
          </Link>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {roles.slice(0, 6).map((role) => (
            <Link
              key={role.title}
              href={`/roles/${encodeURIComponent(role.title)}`}
              className="group rounded-xl border border-gray-200 bg-white p-5 transition-colors hover:border-indigo-300 hover:bg-indigo-50 dark:border-white/10 dark:bg-white/5 dark:hover:bg-indigo-500/10"
            >
              <p className="font-medium group-hover:text-indigo-700 dark:group-hover:text-indigo-300">
                {role.title}
              </p>
              <p className="mt-1 line-clamp-2 text-sm text-gray-500 dark:text-gray-400">
                {role.description}
              </p>
              <p className="mt-3 text-xs text-gray-400">{role.coreSkills} core skills</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="mb-14">
        <h2 className="mb-4 text-xl font-semibold">Browse skills by category</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((category) => {
            const count = skills.filter((s) => s.category === category).length;
            return (
              <Link
                key={category}
                href={`/skills?category=${encodeURIComponent(category)}`}
                className="group flex items-center justify-between rounded-xl border border-gray-200 bg-white px-5 py-4 transition-colors hover:border-indigo-300 hover:bg-indigo-50 dark:border-white/10 dark:bg-white/5 dark:hover:bg-indigo-500/10"
              >
                <span className="font-medium">{category}</span>
                <span className="text-sm text-gray-400 group-hover:text-indigo-600">
                  {count} skills →
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="rounded-2xl border border-indigo-100 bg-indigo-50/60 p-6 dark:border-indigo-500/20 dark:bg-indigo-500/5">
        <h2 className="mb-3 text-lg font-semibold">Why a graph database?</h2>
        <p className="mb-3 text-sm leading-6 text-gray-700 dark:text-gray-300">
          The question this app exists to answer — <em>&ldquo;what should I learn next to become
          an ML Engineer, given what I already know?&rdquo;</em> — is a traversal, not a lookup. It
          fans out from a role across its required skills, expands each into a prerequisite chain
          that can run six hops deep, subtracts the skills you already have, and attaches the
          shortest course for every remaining step.
        </p>
        <p className="text-sm leading-6 text-gray-700 dark:text-gray-300">
          In Cypher that&apos;s one query. In SQL it&apos;s a recursive CTE seeded from a join, a
          second correlated recursion to rank each result, and a window function for the cheapest
          course — rebuilt on every request, because the answer changes the moment you tick one
          more box. The README walks through the exact queries.
        </p>
      </section>
    </div>
  );
}
