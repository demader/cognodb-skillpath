"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useLearner } from "@/components/LearnerProvider";
import { LevelBadge } from "@/components/LevelBadge";
import { LoadingState, EmptyState, ErrorState } from "@/components/StateViews";
import type { RecommendedCourse, RoleReadiness, SkillSummary } from "@/lib/types";

export default function ProfilePage() {
  const { email, name, setName, knownSkills, targetRole, toggleSkillKnown, loading, offline } =
    useLearner();

  const [skills, setSkills] = useState<SkillSummary[] | null>(null);
  const [skillsError, setSkillsError] = useState<string | null>(null);

  const [readiness, setReadiness] = useState<RoleReadiness[] | null>(null);
  const [recommendations, setRecommendations] = useState<RecommendedCourse[] | null>(null);
  const [derivedError, setDerivedError] = useState<string | null>(null);
  const [derivedLoading, setDerivedLoading] = useState(true);

  useEffect(() => {
    fetch("/api/skills")
      .then(async (res) => {
        if (!res.ok) throw new Error((await res.json()).error ?? "Failed to load skills.");
        return res.json();
      })
      .then((data: SkillSummary[]) => setSkills(data))
      .catch((err) => setSkillsError(err.message));
  }, []);

  // Both panels below are derived from the learner's KNOWS set, so they refetch together
  // whenever it changes.
  useEffect(() => {
    if (loading) return;
    let cancelled = false;
    const body = JSON.stringify({ known: knownSkills });
    const post = (url: string) =>
      fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body }).then(
        async (res) => {
          if (!res.ok) throw new Error((await res.json()).error ?? "Request failed.");
          return res.json();
        }
      );

    Promise.all([post("/api/readiness"), post("/api/recommendations")])
      .then(([readinessData, recData]) => {
        if (cancelled) return;
        setReadiness(readinessData);
        setRecommendations(recData);
        setDerivedError(null);
        setDerivedLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        setDerivedError(err.message);
        setDerivedLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [knownSkills, loading]);

  const grouped = useMemo(() => {
    const map = new Map<string, SkillSummary[]>();
    for (const skill of skills ?? []) {
      const key = skill.category ?? "Other";
      map.set(key, [...(map.get(key) ?? []), skill]);
    }
    return map;
  }, [skills]);

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-bold tracking-tight">My profile</h1>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
        Your identity lives in this browser
        {email && <span className="text-gray-400"> ({email})</span>}; the skills you know are
        stored as <code className="text-xs">KNOWS</code> relationships in CognoDB.
      </p>

      {offline && (
        <p className="mt-4 rounded-lg border border-amber-300 bg-amber-50 px-4 py-2.5 text-sm text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
          Changes aren&apos;t saving right now — SkillPath can&apos;t reach CognoDB.
        </p>
      )}

      <div className="mt-6 flex flex-wrap items-end gap-4">
        <div className="max-w-xs flex-1">
          <label htmlFor="displayName" className="mb-1 block text-sm font-medium">
            Display name
          </label>
          <input
            id="displayName"
            key={name}
            defaultValue={name}
            onBlur={(e) => e.target.value.trim() && setName(e.target.value.trim())}
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-white/20 dark:bg-neutral-900"
          />
        </div>
        {targetRole && (
          <p className="pb-2 text-sm text-gray-500 dark:text-gray-400">
            Target role:{" "}
            <Link
              href={`/roles/${encodeURIComponent(targetRole)}`}
              className="font-medium text-indigo-600 hover:underline"
            >
              {targetRole}
            </Link>
          </p>
        )}
      </div>

      <section className="mt-10">
        <h2 className="mb-1 text-lg font-semibold">Skills you know</h2>
        <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
          Toggle everything you&apos;re already comfortable with — every panel below is computed
          from this set. {knownSkills.length} selected.
        </p>

        {skillsError && <ErrorState message={skillsError} />}
        {!skillsError && !skills && <LoadingState label="Loading skill catalog…" />}
        {skills && (
          <div className="flex flex-col gap-4">
            {[...grouped.entries()].map(([category, categorySkills]) => (
              <div key={category}>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
                  {category}
                </p>
                <div className="flex flex-wrap gap-2">
                  {categorySkills.map((skill) => {
                    const known = knownSkills.includes(skill.name);
                    return (
                      <button
                        key={skill.name}
                        onClick={() => toggleSkillKnown(skill.name, !known)}
                        aria-pressed={known}
                        className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                          known
                            ? "border-emerald-600 bg-emerald-600 text-white"
                            : "border-gray-300 hover:bg-gray-100 dark:border-white/20 dark:hover:bg-white/10"
                        }`}
                      >
                        {known && "✓ "}
                        {skill.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="mt-12">
        <h2 className="mb-1 text-lg font-semibold">How close you are to each role</h2>
        <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
          Scored across every role&apos;s core skills in a single query.
        </p>

        {derivedLoading && <LoadingState label="Scoring roles…" />}
        {!derivedLoading && derivedError && <ErrorState message={derivedError} />}
        {!derivedLoading && !derivedError && readiness && (
          <div className="flex flex-col gap-2">
            {readiness.map((entry) => (
              <Link
                key={entry.role.title}
                href={`/roles/${encodeURIComponent(entry.role.title)}`}
                className="flex items-center gap-4 rounded-lg border border-gray-200 bg-white px-4 py-3 transition-colors hover:border-indigo-300 dark:border-white/10 dark:bg-white/5"
              >
                <span className="w-48 shrink-0 truncate text-sm font-medium">
                  {entry.role.title}
                </span>
                <span className="h-2 flex-1 overflow-hidden rounded-full bg-gray-200 dark:bg-white/10">
                  <span
                    className="block h-full rounded-full bg-indigo-600 transition-all duration-500"
                    style={{ width: `${entry.readiness}%` }}
                  />
                </span>
                <span className="w-20 shrink-0 text-right text-sm tabular-nums text-gray-500 dark:text-gray-400">
                  {entry.coreKnown}/{entry.coreSkills}
                </span>
                <span className="w-12 shrink-0 text-right text-sm font-semibold tabular-nums">
                  {entry.readiness}%
                </span>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="mt-12">
        <h2 className="mb-1 text-lg font-semibold">Courses you&apos;re ready for</h2>
        <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
          Every prerequisite already met, and something new still left to learn.
        </p>

        {derivedLoading && <LoadingState label="Matching courses to what you know…" />}
        {!derivedLoading && derivedError && <ErrorState message={derivedError} />}
        {!derivedLoading && !derivedError && recommendations?.length === 0 && (
          <EmptyState
            title="No matches yet"
            description="Mark a few foundational skills as known above — Programming Basics is a good start."
          />
        )}
        {!derivedLoading && !derivedError && recommendations && recommendations.length > 0 && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {recommendations.map((course) => (
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
                </p>
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                  {course.description}
                </p>
                <p className="mt-2 text-xs text-gray-400">
                  Teaches you:{" "}
                  {course.newSkills.map((skillName, i) => (
                    <span key={skillName}>
                      {i > 0 && ", "}
                      <Link
                        href={`/skills/${encodeURIComponent(skillName)}`}
                        className="hover:underline"
                      >
                        {skillName}
                      </Link>
                    </span>
                  ))}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
