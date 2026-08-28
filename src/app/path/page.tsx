"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useLearner } from "@/components/LearnerProvider";
import { LevelBadge } from "@/components/LevelBadge";
import { LoadingState, EmptyState, ErrorState } from "@/components/StateViews";
import type { LearningPathStep, Skill } from "@/lib/types";

export default function PathFinderPage() {
  const { knownSkills, toggleSkillKnown, loading: learnerLoading } = useLearner();

  const [skills, setSkills] = useState<Skill[] | null>(null);
  const [skillsError, setSkillsError] = useState<string | null>(null);
  const [target, setTarget] = useState("");
  const [path, setPath] = useState<LearningPathStep[] | null>(null);
  const [pathLoading, setPathLoading] = useState(false);
  const [pathError, setPathError] = useState<string | null>(null);
  const [showKnownPanel, setShowKnownPanel] = useState(false);

  useEffect(() => {
    fetch("/api/skills")
      .then(async (res) => {
        if (!res.ok) throw new Error((await res.json()).error ?? "Failed to load skills.");
        return res.json();
      })
      .then((data: Skill[]) => setSkills(data))
      .catch((err) => setSkillsError(err.message));
  }, []);

  const grouped = useMemo(() => {
    if (!skills) return new Map<string, Skill[]>();
    const map = new Map<string, Skill[]>();
    for (const skill of skills) {
      const key = skill.category ?? "Other";
      map.set(key, [...(map.get(key) ?? []), skill]);
    }
    return map;
  }, [skills]);

  async function findPath(targetName: string) {
    setPathLoading(true);
    setPathError(null);
    setPath(null);
    try {
      const res = await fetch("/api/path", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target: targetName, known: knownSkills }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Could not compute a path.");
      setPath(await res.json());
    } catch (err) {
      setPathError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setPathLoading(false);
    }
  }

  const totalHours = path
    ?.filter((step) => step.recommendedCourse)
    .reduce((sum, step) => sum + (step.recommendedCourse?.hours ?? 0), 0);

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-bold tracking-tight">Path finder</h1>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
        Pick a skill you want to reach. We&apos;ll walk the prerequisite graph, skip anything you
        already know, and suggest a course for every step in between.
      </p>

      <div className="mt-6 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 p-5">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[220px]">
            <label className="mb-1 block text-sm font-medium">Target skill</label>
            {skillsError ? (
              <p className="text-sm text-rose-600">{skillsError}</p>
            ) : (
              <select
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                className="w-full rounded-lg border border-gray-300 dark:border-white/20 bg-white dark:bg-neutral-900 px-3 py-2 text-sm"
                disabled={!skills}
              >
                <option value="">{skills ? "Choose a skill…" : "Loading skills…"}</option>
                {[...grouped.entries()].map(([category, categorySkills]) => (
                  <optgroup key={category} label={category}>
                    {categorySkills.map((s) => (
                      <option key={s.name} value={s.name}>
                        {s.name}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            )}
          </div>
          <button
            onClick={() => target && findPath(target)}
            disabled={!target || pathLoading}
            className="rounded-lg bg-indigo-600 px-5 py-2 font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
          >
            {pathLoading ? "Finding…" : "Find path"}
          </button>
        </div>

        <button
          onClick={() => setShowKnownPanel((v) => !v)}
          className="mt-4 text-sm text-indigo-600 hover:underline"
        >
          {showKnownPanel ? "Hide" : "Edit"} what you already know ({knownSkills.length} skill
          {knownSkills.length === 1 ? "" : "s"})
        </button>

        {showKnownPanel && skills && (
          <div className="mt-3 max-h-64 overflow-y-auto rounded-lg border border-gray-200 dark:border-white/10 p-3">
            {[...grouped.entries()].map(([category, categorySkills]) => (
              <div key={category} className="mb-3 last:mb-0">
                <p className="mb-1 text-xs font-semibold uppercase text-gray-400">{category}</p>
                <div className="flex flex-wrap gap-2">
                  {categorySkills.map((s) => {
                    const known = knownSkills.includes(s.name);
                    return (
                      <button
                        key={s.name}
                        onClick={() => toggleSkillKnown(s.name, !known)}
                        className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                          known
                            ? "bg-emerald-600 text-white"
                            : "bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-300"
                        }`}
                      >
                        {s.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-8">
        {pathLoading && <LoadingState label="Walking the prerequisite graph…" />}
        {pathError && <ErrorState message={pathError} />}
        {!pathLoading && !pathError && path && path.length === 0 && (
          <EmptyState
            title="You already know everything needed for this skill 🎉"
            description="No gaps found between your known skills and this target."
          />
        )}
        {!pathLoading && !pathError && path && path.length > 0 && (
          <div>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">
                {path.length} step{path.length === 1 ? "" : "s"} to {target}
              </h2>
              {typeof totalHours === "number" && (
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  ~{totalHours}h of coursework
                </span>
              )}
            </div>
            <ol className="flex flex-col gap-3">
              {path.map((step, i) => (
                <li
                  key={step.skill.name}
                  className="flex gap-4 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 p-4"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-500/20 text-sm font-semibold text-indigo-700 dark:text-indigo-300">
                    {i + 1}
                  </div>
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={`/skills/${encodeURIComponent(step.skill.name)}`}
                        className="font-medium hover:underline"
                      >
                        {step.skill.name}
                      </Link>
                      <LevelBadge level={step.skill.level} />
                    </div>
                    {step.recommendedCourse ? (
                      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        Take <span className="font-medium">{step.recommendedCourse.title}</span> —{" "}
                        {step.recommendedCourse.provider} · {step.recommendedCourse.hours}h
                      </p>
                    ) : (
                      <p className="mt-1 text-sm text-amber-600 dark:text-amber-400">
                        No course in the catalog teaches this yet.
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          </div>
        )}
        {!pathLoading && !pathError && !path && !learnerLoading && (
          <EmptyState
            title="No path yet"
            description="Choose a target skill above and we'll plot the route from what you know."
          />
        )}
      </div>
    </div>
  );
}
