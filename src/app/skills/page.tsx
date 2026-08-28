import Link from "next/link";
import { getCategories, getSkills } from "@/lib/queries";
import { DatabaseUnavailableError } from "@/lib/neo4j";
import { ErrorState, EmptyState } from "@/components/StateViews";
import { LevelBadge } from "@/components/LevelBadge";

export const dynamic = "force-dynamic";

export default async function SkillsPage({ searchParams }: PageProps<"/skills">) {
  const { category: categoryParam } = await searchParams;
  const category = Array.isArray(categoryParam) ? categoryParam[0] : categoryParam;

  let data: {
    categories: string[];
    skills: Awaited<ReturnType<typeof getSkills>>;
  } | null = null;
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
        <FilterChip href="/skills" label="All" active={!category} />
        {categories.map((cat) => (
          <FilterChip
            key={cat}
            href={`/skills?category=${encodeURIComponent(cat)}`}
            label={cat}
            active={category === cat}
          />
        ))}
      </div>

      <div className="mt-8">
        {skills.length === 0 ? (
          <EmptyState
            title="No skills found"
            description="Try a different category, or run npm run seed if this is a fresh instance."
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {skills.map((skill) => (
              <Link
                key={skill.name}
                href={`/skills/${encodeURIComponent(skill.name)}`}
                className="flex flex-col gap-2 rounded-xl border border-gray-200 bg-white p-5 transition-shadow hover:shadow-md dark:border-white/10 dark:bg-white/5"
              >
                <div className="flex items-start justify-between gap-2">
                  <h2 className="font-semibold leading-snug">{skill.name}</h2>
                  <LevelBadge level={skill.level} />
                </div>
                <p className="line-clamp-2 text-sm text-gray-500 dark:text-gray-400">
                  {skill.description}
                </p>
                <div className="mt-auto flex items-center gap-3 pt-2 text-xs text-gray-400">
                  <span>{skill.category}</span>
                  <span aria-hidden>·</span>
                  <span>
                    {skill.courseCount} course{skill.courseCount === 1 ? "" : "s"}
                  </span>
                  {skill.roleCount > 0 && (
                    <>
                      <span aria-hidden>·</span>
                      <span>
                        {skill.roleCount} role{skill.roleCount === 1 ? "" : "s"}
                      </span>
                    </>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function FilterChip({ href, label, active }: { href: string; label: string; active: boolean }) {
  return (
    <Link
      href={href}
      className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
        active
          ? "bg-indigo-600 text-white"
          : "border border-gray-200 bg-white hover:bg-gray-100 dark:border-white/10 dark:bg-white/10 dark:hover:bg-white/20"
      }`}
    >
      {label}
    </Link>
  );
}
