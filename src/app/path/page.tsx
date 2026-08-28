"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useLearner } from "@/components/LearnerProvider";
import { LevelBadge } from "@/components/LevelBadge";
import { LoadingState, EmptyState, ErrorState } from "@/components/StateViews";
import type { PathStep, Role, SkillSummary } from "@/lib/types";

type TargetType = "role" | "skill";

export default function PathFinderPage() {
  const { knownSkills, toggleSkillKnown, loading: learnerLoading } = useLearner();

  const [skills, setSkills] = useState<SkillSummary[] | null>(null);
  const [roles, setRoles] = useState<Role[] | null>(null);
  const [catalogError, setCatalogError] = useState<string | null>(null);

  const [targetType, setTargetType] = useState<TargetType>("role");
  const [target, setTarget] = useState("");
  const [path, setPath] = useState<PathStep[] | null>(null);
  const [pathLoading, setPathLoading] = useState(false);
  const [pathError, setPathError] = useState<string | null>(null);
  const [searchedFor, setSearchedFor] = useState("");
  const [showKnownPanel, setShowKnownPanel] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/skills").then(async (res) => {
        if (!res.ok) throw new Error((await res.json()).error ?? "Failed to load skills.");
        return res.json();
      }),
      fetch("/api/roles").then(async (res) => {
        if (!res.ok) throw new Error((await res.json()).error ?? "Failed to load roles.");
        return res.json();
      }),
    ])
      .then(([skillData, roleData]) => {
        setSkills(skillData);
        setRoles(roleData);
      })
      .catch((err) => setCatalogError(err.message));
  }, []);

  const grouped = useMemo(() => {
    const map = new Map<string, SkillSummary[]>();
    for (const skill of skills ?? []) {
      const key = skill.category ?? "Other";
      map.set(key, [...(map.get(key) ?? []), skill]);
    }
    return map;
  }, [skills]);

  async function findPath() {
    if (!target) return;
    setPathLoading(true);
    setPathError(null);
    setPath(null);
    setSearchedFor(target);
    try {
      const res = await fetch("/api/path", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetType, target, known: knownSkills }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Could not build a path.");
      setPath(await res.json());
    } catch (err) {
      setPathError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setPathLoading(false);
    }
  }

  const totalHours =
    path?.reduce((sum, step) => sum + (step.recommendedCourse?.hours ?? 0), 0) ?? 0;

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-bold tracking-tight">Path finder</h1>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
        Choose a role or a single skill to reach. SkillPath walks the prerequisite graph, skips
        everything you already know, and suggests the shortest course for each remaining step.
      </p>

      <div className="mt-6 rounded-xl border border-gray-200 bg-white p-5 dark:border-white/10 dark:bg-white/5">
        <div className="mb-4 inline-flex rounded-lg border border-gray-200 p-0.5 dark:border-white/10">
          {(["role", "skill"] as const).map((type) => (
            <button
              key={type}
              onClick={() => {
                setTargetType(type);
                setTarget("");
              }}
              className={`rounded-md px-4 py-1.5 text-sm font-medium capitalize transition-colors ${
                targetType === type
                  ? "bg-indigo-600 text-white"
                  : "text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/10"
              }`}
            >
              {type === "role" ? "A role" : "A single skill"}
            </button>
          ))}
        </div>

        {catalogError ? (
          <ErrorState message={catalogError} />
        ) : (
          <div className="flex flex-wrap items-end gap-3">
            <div className="min-w-[220px] flex-1">
              <label htmlFor="target" className="mb-1 block text-sm font-medium">
                {targetType === "role" ? "Target role" : "Target skill"}
              </label>
              <select
                id="target"
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                disabled={!skills || !roles}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm disabled:opacity-50 dark:border-white/20 dark:bg-neutral-900"
              >
                <option value="">
                  {skills && roles ? "Choose…" : "Loading catalog…"}
                </option>
                {targetType === "role"
                  ? roles?.map((role) => (
                      <option key={role.title} value={role.title}>
                        {role.title}
                      </option>
                    ))
                  : [...grouped.entries()].map(([category, categorySkills]) => (
                      <optgroup key={category} label={category}>
                        {categorySkills.map((s) => (
                          <option key={s.name} value={s.name}>
                            {s.name}
                          </option>
                        ))}
                      </optgroup>
                    ))}
              </select>
            </div>
            <button
              onClick={findPath}
              disabled={!target || pathLoading}
              className="rounded-lg bg-indigo-600 px-5 py-2 font-medium text-white transition-colors hover:bg-indigo-500 disabled:opacity-50"
            >
              {pathLoading ? "Finding…" : "Find path"}
            </button>
          </div>
        )}

        <button
          onClick={() => setShowKnownPanel((v) => !v)}
          className="mt-4 text-sm text-indigo-600 hover:underline"
        >
          {showKnownPanel ? "Hide" : "Edit"} what you already know ({knownSkills.length} skill
          {knownSkills.length === 1 ? "" : "s"})
        </button>

        {showKnownPanel && skills && (
          <div className="mt-3 max-h-64 overflow-y-auto rounded-lg border border-gray-200 p-3 dark:border-white/10">
            {[...grouped.entries()].map(([category, categorySkills]) => (
              <div key={category} className="mb-3 last:mb-0">
                <p className="mb-1.5 text-xs font-semibold uppercase text-gray-400">{category}</p>
                <div className="flex flex-wrap gap-2">
                  {categorySkills.map((s) => {
                    const known = knownSkills.includes(s.name);
                    return (
                      <button
                        key={s.name}
                        onClick={() => toggleSkillKnown(s.name, !known)}
                        className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                          known
                            ? "bg-emerald-600 text-white"
                            : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-white/10 dark:text-gray-300 dark:hover:bg-white/20"
                        }`}
                      >
                        {known && "✓ "}
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
        {!pathLoading && pathError && <ErrorState message={pathError} />}
        {!pathLoading && !pathError && path?.length === 0 && (
          <EmptyState
            title={`You're already ready for ${searchedFor} 🎉`}
            description="Every skill it needs is marked as known on your profile."
          />
        )}
        {!pathLoading && !pathError && path && path.length > 0 && (
          <>
            <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-lg font-semibold">
                {path.length} step{path.length === 1 ? "" : "s"} to {searchedFor}
              </h2>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                ~{totalHours}h of coursework
              </span>
            </div>
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
                      <p className="mt-1 text-xs text-gray-400">Unlocks: {step.unlocks.join(", ")}</p>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          </>
        )}
        {!pathLoading && !pathError && !path && !learnerLoading && (
          <EmptyState
            title="No path yet"
            description="Pick a target above and we'll plot the route from what you already know."
          />
        )}
      </div>
    </div>
  );
}
