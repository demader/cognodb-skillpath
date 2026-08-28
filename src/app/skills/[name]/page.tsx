import Link from "next/link";
import { notFound } from "next/navigation";
import { getPrerequisiteChain, getSkillDetail } from "@/lib/queries";
import { DatabaseUnavailableError } from "@/lib/neo4j";
import { ErrorState } from "@/components/StateViews";
import { LevelBadge } from "@/components/LevelBadge";
import { KnowToggle } from "@/components/KnowToggle";
import { PrerequisiteChain } from "@/components/PrerequisiteChain";
import { decodeRouteParam } from "@/lib/route-params";
import type { Course, RelatedSkill } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function SkillDetailPage({ params }: PageProps<"/skills/[name]">) {
  // Page params arrive percent-encoded; decodeRouteParam also survives a name
  // containing a literal '%', which would otherwise throw an unhandled URIError.
  const { name: rawName } = await params;
  const name = decodeRouteParam(rawName);

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

  const {
    skill,
    directPrerequisites,
    directDependents,
    teachingCourses,
    requiringCourses,
    neededByRoles,
  } = detail;

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <Link href="/skills" className="text-sm text-indigo-600 hover:underline">
        ← All skills
      </Link>

      <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight">{skill.name}</h1>
            <LevelBadge level={skill.level} />
          </div>
          <p className="mt-2 max-w-xl text-gray-600 dark:text-gray-400">{skill.description}</p>
          <Link
            href={`/skills?category=${encodeURIComponent(skill.category)}`}
            className="mt-2 inline-block text-sm text-indigo-600 hover:underline"
          >
            {skill.category}
          </Link>
        </div>
        <KnowToggle skillName={skill.name} />
      </div>

      <section className="mt-10">
        <h2 className="mb-1 text-lg font-semibold">Full prerequisite chain</h2>
        <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
          Every skill that must come before this one, at any depth — one multi-hop traversal of
          the <code className="text-xs">PREREQUISITE_OF</code> relationship.
        </p>
        <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-white/10 dark:bg-white/5">
          <PrerequisiteChain chain={chain} targetName={skill.name} />
        </div>
      </section>

      <div className="mt-10 grid grid-cols-1 gap-8 sm:grid-cols-2">
        <SkillList
          title="Direct prerequisites"
          emptyLabel="None — this is a starting point."
          skills={directPrerequisites}
        />
        <SkillList
          title="Unlocks next"
          emptyLabel="Nothing in the catalog builds directly on this yet."
          skills={directDependents}
        />
      </div>

      {neededByRoles.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-3 text-lg font-semibold">Roles that need this skill</h2>
          <div className="flex flex-wrap gap-2">
            {neededByRoles.map((role) => (
              <Link
                key={role.title}
                href={`/roles/${encodeURIComponent(role.title)}`}
                className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm transition-colors hover:border-indigo-300 dark:border-white/10 dark:bg-white/5"
              >
                {role.title}
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    role.importance === "core"
                      ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300"
                      : "bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-gray-400"
                  }`}
                >
                  {role.importance}
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="mt-10">
        <h2 className="mb-3 text-lg font-semibold">Courses that teach this skill</h2>
        {teachingCourses.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">No course covers this yet.</p>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {teachingCourses.map((course) => (
              <div
                key={course.title}
                className="rounded-lg border border-gray-200 bg-white p-4 dark:border-white/10 dark:bg-white/5"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="font-medium">{course.title}</p>
                  <LevelBadge level={course.level} />
                </div>
                <p className="mt-1 text-xs text-gray-400">
                  {course.provider} · {course.hours}h
                  {course.coverage === "partial" && " · covers this partially"}
                </p>
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                  {course.description}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>

      {requiringCourses.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-3 text-lg font-semibold">Courses that require this skill first</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {requiringCourses.map((course: Course) => (
              <div
                key={course.title}
                className="rounded-lg border border-gray-200 bg-white p-4 dark:border-white/10 dark:bg-white/5"
              >
                <p className="font-medium">{course.title}</p>
                <p className="mt-1 text-xs text-gray-400">
                  {course.provider} · {course.hours}h
                </p>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function SkillList({
  title,
  emptyLabel,
  skills,
}: {
  title: string;
  emptyLabel: string;
  skills: RelatedSkill[];
}) {
  return (
    <section>
      <h2 className="mb-3 text-lg font-semibold">{title}</h2>
      {skills.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">{emptyLabel}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {skills.map((skill) => (
            <li key={skill.name}>
              <Link
                href={`/skills/${encodeURIComponent(skill.name)}`}
                className="flex items-center justify-between gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm transition-colors hover:border-indigo-300 dark:border-white/10 dark:bg-white/5"
              >
                <span className="flex items-center gap-2">
                  {skill.name}
                  {skill.strength === "recommended" && (
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500 dark:bg-white/10 dark:text-gray-400">
                      recommended
                    </span>
                  )}
                </span>
                <LevelBadge level={skill.level} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
