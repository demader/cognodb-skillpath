import Link from "next/link";
import { getCategories, getAllCourses, getSkills } from "@/lib/queries";
import { DatabaseUnavailableError } from "@/lib/neo4j";
import { ErrorState } from "@/components/StateViews";

export const dynamic = "force-dynamic";

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

  const { categories, skills, courses } = data!;

  return (
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <section className="mb-14 text-center">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            Find your path from <span className="text-indigo-600">here</span> to{" "}
            <span className="text-indigo-600">there</span>
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-gray-600 dark:text-gray-400">
            SkillPath maps skills, their prerequisites, and the courses that teach them as a
            graph — so it can plot the exact sequence of skills and courses between what you
            know today and the skill you want next.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/path"
              className="rounded-lg bg-indigo-600 px-5 py-2.5 font-medium text-white shadow-sm hover:bg-indigo-500"
            >
              Plan a learning path
            </Link>
            <Link
              href="/skills"
              className="rounded-lg border border-gray-300 dark:border-white/20 px-5 py-2.5 font-medium hover:bg-gray-100 dark:hover:bg-white/10"
            >
              Explore skills
            </Link>
          </div>
        </section>

        <section className="mb-14 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            { label: "Skills", value: skills.length },
            { label: "Courses", value: courses.length },
            { label: "Categories", value: categories.length },
            {
              label: "Total course hours",
              value: courses.reduce((sum, c) => sum + c.hours, 0),
            },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 p-5 text-center"
            >
              <p className="text-3xl font-bold text-indigo-600">{stat.value}</p>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{stat.label}</p>
            </div>
          ))}
        </section>

        <section className="mb-14">
          <h2 className="mb-4 text-xl font-semibold">Browse by category</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {categories.map((category) => {
              const count = skills.filter((s) => s.category === category).length;
              return (
                <Link
                  key={category}
                  href={`/skills?category=${encodeURIComponent(category)}`}
                  className="group flex items-center justify-between rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 px-5 py-4 transition-colors hover:border-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-500/10"
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

        <section className="rounded-2xl border border-indigo-100 dark:border-indigo-500/20 bg-indigo-50/60 dark:bg-indigo-500/5 p-6">
          <h2 className="mb-2 text-lg font-semibold">Why a graph database?</h2>
          <p className="text-sm leading-6 text-gray-700 dark:text-gray-300">
            Skills unlock other skills, and courses satisfy those prerequisites — a chain that
            can run five or six hops deep (Programming Basics → … → Deep Learning →
            Computer Vision). In CognoDB that&apos;s a single variable-length traversal. In a
            relational schema it&apos;s a recursive CTE joined against a course table, re-run for
            every learner, every time their known-skills set changes. See the README for the
            full comparison and the exact Cypher.
          </p>
        </section>
    </div>
  );
}

function loadHomeData() {
  return Promise.all([getCategories(), getSkills(), getAllCourses()]).then(
    ([categories, skills, courses]) => ({ categories, skills, courses })
  );
}
