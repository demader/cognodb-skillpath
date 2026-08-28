import Link from "next/link";
import { notFound } from "next/navigation";
import { getPrerequisiteChain, getSkillDetail } from "@/lib/queries";
import { DatabaseUnavailableError } from "@/lib/neo4j";
import { ErrorState } from "@/components/StateViews";
import { LevelBadge } from "@/components/LevelBadge";
import { KnowToggle } from "@/components/KnowToggle";
import { PrerequisiteChain } from "@/components/PrerequisiteChain";

export const dynamic = "force-dynamic";

export default async function SkillDetailPage({
  params,
}: PageProps<"/skills/[name]">) {
  const { name: rawName } = await params;
  const name = decodeURIComponent(rawName);

  let detail: Awaited<ReturnType<typeof getSkillDetail>> = null;
  let chain: Awaited<ReturnType<typeof getPrerequisiteChain>> = [];
  let dbError: string | null = null;
  try {
    [detail, chain] = await Promise.all([getSkillDetail(name), getPrerequisiteChain(name)]);
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
  if (!detail) notFound();

  const { skill, directPrerequisites, directDependents, teachingCourses, requiringCourses } =
    detail;

  return (
      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
        <Link href="/skills" className="text-sm text-indigo-600 hover:underline">
          ← All skills
        </Link>

        <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight">{skill.name}</h1>
              <LevelBadge level={skill.level} />
            </div>
            <p className="mt-2 max-w-xl text-gray-600 dark:text-gray-400">{skill.description}</p>
          </div>
          <KnowToggle skillName={skill.name} />
        </div>

        <section className="mt-10">
          <h2 className="mb-3 text-lg font-semibold">Full prerequisite chain</h2>
          <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
            Every skill that must come before this one, however many hops away — a single
            multi-hop graph traversal.
          </p>
          <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 p-5">
            <PrerequisiteChain chain={chain} targetName={skill.name} />
          </div>
        </section>

        <div className="mt-10 grid grid-cols-1 gap-8 sm:grid-cols-2">
          <section>
            <h2 className="mb-3 text-lg font-semibold">Direct prerequisites</h2>
            {directPrerequisites.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">None — this is a starting point.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {directPrerequisites.map((s) => (
                  <li key={s.name}>
                    <Link
                      href={`/skills/${encodeURIComponent(s.name)}`}
                      className="flex items-center justify-between rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 px-4 py-2.5 text-sm hover:border-indigo-300"
                    >
                      {s.name}
                      <LevelBadge level={s.level} />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold">Unlocks next</h2>
            {directDependents.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Nothing in the catalog builds directly on this yet.
              </p>
            ) : (
              <ul className="flex flex-col gap-2">
                {directDependents.map((s) => (
                  <li key={s.name}>
                    <Link
                      href={`/skills/${encodeURIComponent(s.name)}`}
                      className="flex items-center justify-between rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 px-4 py-2.5 text-sm hover:border-indigo-300"
                    >
                      {s.name}
                      <LevelBadge level={s.level} />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <section className="mt-10">
          <h2 className="mb-3 text-lg font-semibold">Courses that teach this skill</h2>
          {teachingCourses.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">No course covers this yet.</p>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {teachingCourses.map((c) => (
                <div
                  key={c.title}
                  className="rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 p-4"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-medium">{c.title}</p>
                    <LevelBadge level={c.level} />
                  </div>
                  <p className="mt-1 text-xs text-gray-400">
                    {c.provider} · {c.hours}h
                  </p>
                  <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{c.description}</p>
                </div>
              ))}
            </div>
          )}
        </section>

        {requiringCourses.length > 0 && (
          <section className="mt-10">
            <h2 className="mb-3 text-lg font-semibold">Courses that require this skill first</h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {requiringCourses.map((c) => (
                <div
                  key={c.title}
                  className="rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 p-4"
                >
                  <p className="font-medium">{c.title}</p>
                  <p className="mt-1 text-xs text-gray-400">
                    {c.provider} · {c.hours}h
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}
    </div>
  );
}
