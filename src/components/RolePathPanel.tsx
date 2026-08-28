"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useLearner } from "./LearnerProvider";
import { LevelBadge } from "./LevelBadge";
import { LoadingState, EmptyState, ErrorState } from "./StateViews";
import type { PathStep, RoleNeed } from "@/lib/types";

/**
 * The personalized half of a role page: which of the role's skills the learner
 * already holds, and the generated path through everything still missing.
 */
export function RolePathPanel({ role, needs }: { role: string; needs: RoleNeed[] }) {
  const { knownSkills, targetRole, setTargetRole, loading: learnerLoading } = useLearner();

  const [path, setPath] = useState<PathStep[] | null>(null);
  const [pathError, setPathError] = useState<string | null>(null);
  const [pathLoading, setPathLoading] = useState(true);
  const [includeNiceToHave, setIncludeNiceToHave] = useState(false);

  const loadPath = useCallback(async () => {
    setPathLoading(true);
    try {
      const res = await fetch("/api/path", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetType: "role",
          target: role,
          known: knownSkills,
          includeNiceToHave,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Could not build a path.");
      setPath(await res.json());
      setPathError(null);
    } catch (err) {
      setPathError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setPathLoading(false);
    }
  }, [role, knownSkills, includeNiceToHave]);

  useEffect(() => {
    if (learnerLoading) return;
    let cancelled = false;
    (async () => {
      if (!cancelled) await loadPath();
    })();
    return () => {
      cancelled = true;
    };
  }, [loadPath, learnerLoading]);

  const core = needs.filter((n) => n.importance === "core");
  const nice = needs.filter((n) => n.importance === "nice-to-have");
  const coreKnown = core.filter((n) => knownSkills.includes(n.name));
  const readiness = core.length ? Math.round((coreKnown.length / core.length) * 100) : 0;
  const isTarget = targetRole === role;
  const totalHours =
    path?.reduce((sum, step) => sum + (step.recommendedCourse?.hours ?? 0), 0) ?? 0;

  return (
    <>
      <section className="mt-8 rounded-xl border border-gray-200 bg-white p-6 dark:border-white/10 dark:bg-white/5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Your readiness</p>
            <p className="mt-1 text-3xl font-bold text-indigo-600">{readiness}%</p>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {coreKnown.length} of {core.length} core skills
            </p>
          </div>
          <button
            onClick={() => setTargetRole(isTarget ? null : role)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              isTarget
                ? "bg-emerald-600 text-white hover:bg-emerald-500"
                : "border border-gray-300 hover:bg-gray-100 dark:border-white/20 dark:hover:bg-white/10"
            }`}
          >
            {isTarget ? "✓ Your target role" : "Set as my target role"}
          </button>
        </div>

        <div
          className="mt-4 h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-white/10"
          role="progressbar"
          aria-valuenow={readiness}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${readiness}% ready for ${role}`}
        >
          <div
            className="h-full rounded-full bg-indigo-600 transition-all duration-500"
            style={{ width: `${readiness}%` }}
          />
        </div>
      </section>

      <section className="mt-10">
        <h2 className="mb-3 text-lg font-semibold">Skills this role needs</h2>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <SkillColumn title="Core" skills={core} knownSkills={knownSkills} />
          {nice.length > 0 && (
            <SkillColumn title="Nice to have" skills={nice} knownSkills={knownSkills} />
          )}
        </div>
      </section>

      <section className="mt-12">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Your path to this role</h2>
          <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <input
              type="checkbox"
              checked={includeNiceToHave}
              onChange={(e) => setIncludeNiceToHave(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 accent-indigo-600"
            />
            Include nice-to-have skills
          </label>
        </div>

        {pathLoading && <LoadingState label="Walking the prerequisite graph…" />}
        {!pathLoading && pathError && <ErrorState message={pathError} />}
        {!pathLoading && !pathError && path?.length === 0 && (
          <EmptyState
            title="You're ready for this role 🎉"
            description="Every skill it needs is already marked as known on your profile."
          />
        )}
        {!pathLoading && !pathError && path && path.length > 0 && (
          <>
            <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
              {path.length} skill{path.length === 1 ? "" : "s"} to learn · roughly {totalHours}h of
              coursework · ordered so nothing is blocked by something further down.
            </p>
            <ol className="flex flex-col gap-3">
              {path.map((step, i) => (
                <li
                  key={step.skill.name}
                  className="flex gap-4 rounded-xl border border-gray-200 bg-white p-4 dark:border-white/10 dark:bg-white/5"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-sm font-semibold text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300">
                    {i + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={`/skills/${encodeURIComponent(step.skill.name)}`}
                        className="font-medium hover:underline"
                      >
                        {step.skill.name}
                      </Link>
                      <LevelBadge level={step.skill.level} />
                      {step.isGoal && (
                        <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300">
                          role requirement
                        </span>
                      )}
                    </div>
                    {step.recommendedCourse ? (
                      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        Take{" "}
                        <span className="font-medium text-gray-700 dark:text-gray-200">
                          {step.recommendedCourse.title}
                        </span>{" "}
                        — {step.recommendedCourse.provider} · {step.recommendedCourse.hours}h
                      </p>
                    ) : (
                      <p className="mt-1 text-sm text-amber-600 dark:text-amber-400">
                        No course in the catalog teaches this yet.
                      </p>
                    )}
                    {step.unlocks && step.unlocks.length > 0 && (
                      <p className="mt-1 text-xs text-gray-400">
                        Unlocks: {step.unlocks.join(", ")}
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          </>
        )}
      </section>
    </>
  );
}

function SkillColumn({
  title,
  skills,
  knownSkills,
}: {
  title: string;
  skills: RoleNeed[];
  knownSkills: string[];
}) {
  return (
    <div>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">{title}</p>
      <ul className="flex flex-col gap-2">
        {skills.map((skill) => {
          const known = knownSkills.includes(skill.name);
          return (
            <li key={skill.name}>
              <Link
                href={`/skills/${encodeURIComponent(skill.name)}`}
                className={`flex items-center justify-between gap-2 rounded-lg border px-4 py-2.5 text-sm transition-colors ${
                  known
                    ? "border-emerald-300 bg-emerald-50 dark:border-emerald-500/30 dark:bg-emerald-500/10"
                    : "border-gray-200 bg-white hover:border-indigo-300 dark:border-white/10 dark:bg-white/5"
                }`}
              >
                <span className="flex items-center gap-2">
                  <span className={known ? "text-emerald-600" : "text-gray-300 dark:text-gray-600"}>
                    {known ? "✓" : "○"}
                  </span>
                  {skill.name}
                </span>
                <LevelBadge level={skill.level} />
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
