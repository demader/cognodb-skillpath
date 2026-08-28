import Link from "next/link";
import { getCategories, getSkills } from "@/lib/queries";
import { DatabaseUnavailableError } from "@/lib/neo4j";
import { ErrorState, EmptyState } from "@/components/StateViews";
import { LevelBadge } from "@/components/LevelBadge";

export const dynamic = "force-dynamic";

export default async function SkillsPage({
  searchParams,
}: PageProps<"/skills">) {
  const { category: categoryParam } = await searchParams;
  const category = Array.isArray(categoryParam) ? categoryParam[0] : categoryParam;

  let data: { categories: string[]; skills: Awaited<ReturnType<typeof getSkills>> } | null = null;
  let dbError: string | null = null;
  try {
    const [categories, skills] = await Promise.all([getCategories(), getSkills(category)]);
    data = { categories, skills };
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

  const { categories, skills } = data!;

  return (
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <h1 className="text-2xl font-bold tracking-tight">Explore skills</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {skills.length} skill{skills.length === 1 ? "" : "s"}
          {category ? ` in ${category}` : " across every category"}.
        </p>

        <div className="mt-6 flex flex-wrap gap-2">
          <Link
            href="/skills"
            className={`rounded-full px-3 py-1.5 text-sm font-medium ${
              !category
                ? "bg-indigo-600 text-white"
                : "bg-white dark:bg-white/10 border border-gray-200 dark:border-white/10 hover:bg-gray-100 dark:hover:bg-white/20"
            }`}
          >
            All
          </Link>
          {categories.map((cat) => (
            <Link
              key={cat}
              href={`/skills?category=${encodeURIComponent(cat)}`}
              className={`rounded-full px-3 py-1.5 text-sm font-medium ${
                category === cat
                  ? "bg-indigo-600 text-white"
                  : "bg-white dark:bg-white/10 border border-gray-200 dark:border-white/10 hover:bg-gray-100 dark:hover:bg-white/20"
              }`}
            >
              {cat}
            </Link>
          ))}
        </div>

        <div className="mt-8">
          {skills.length === 0 ? (
            <EmptyState
              title="No skills found"
              description="Try a different category, or seed the database if this is a fresh instance."
            />
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {skills.map((skill) => (
                <Link
                  key={skill.name}
                  href={`/skills/${encodeURIComponent(skill.name)}`}
                  className="flex flex-col gap-2 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 p-5 transition-shadow hover:shadow-md"
                >
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold leading-snug">{skill.name}</h3>
                    <LevelBadge level={skill.level} />
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2">
                    {skill.description}
                  </p>
                  <p className="mt-auto pt-2 text-xs text-gray-400">{skill.category}</p>
                </Link>
              ))}
            </div>
          )}
        </div>
    </div>
  );
}
