"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useLearner } from "@/components/LearnerProvider";
import { LevelBadge } from "@/components/LevelBadge";
import { LoadingState, EmptyState, ErrorState } from "@/components/StateViews";
import type { RecommendedCourse, Skill } from "@/lib/types";

export default function ProfilePage() {
  const { email, name, setName, knownSkills, toggleSkillKnown, loading } = useLearner();

  const [skills, setSkills] = useState<Skill[] | null>(null);
  const [skillsError, setSkillsError] = useState<string | null>(null);
  const [recommendations, setRecommendations] = useState<RecommendedCourse[] | null>(null);
  const [recError, setRecError] = useState<string | null>(null);
  const [recLoading, setRecLoading] = useState(true);

  useEffect(() => {
    fetch("/api/skills")
      .then(async (res) => {
        if (!res.ok) throw new Error((await res.json()).error ?? "Failed to load skills.");
        return res.json();
      })
      .then((data: Skill[]) => setSkills(data))
      .catch((err) => setSkillsError(err.message));
  }, []);

  useEffect(() => {
    if (loading) return;
    let cancelled = false;
    fetch("/api/recommendations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ known: knownSkills }),
    })
      .then(async (res) => {
        if (!res.ok) throw new Error((await res.json()).error ?? "Failed to load recommendations.");
        return res.json();
      })
      .then((data: RecommendedCourse[]) => {
        if (cancelled) return;
        setRecommendations(data);
        setRecError(null);
        setRecLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        setRecError(err.message);
        setRecLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [knownSkills, loading]);

  const grouped = useMemo(() => {
    if (!skills) return new Map<string, Skill[]>();
    const map = new Map<string, Skill[]>();
    for (const skill of skills) {
      const key = skill.category ?? "Other";
      map.set(key, [...(map.get(key) ?? []), skill]);
    }
    return map;
  }, [skills]);

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-bold tracking-tight">My profile</h1>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
        Your identity lives in this browser ({email}); the skills you know are stored as
        relationships in CognoDB.
      </p>

      <div className="mt-6 flex items-end gap-3">
        <div className="flex-1 max-w-xs">
          <label className="mb-1 block text-sm font-medium">Display name</label>
          <input
            key={name}
            defaultValue={name}
            onBlur={(e) => e.target.value.trim() && setName(e.target.value.trim())}
            className="w-full rounded-lg border border-gray-300 dark:border-white/20 bg-white dark:bg-neutral-900 px-3 py-2 text-sm"
          />
        </div>
      </div>

      <section className="mt-10">
        <h2 className="mb-1 text-lg font-semibold">Skills you know</h2>
        <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
          Toggle every skill you&apos;re already comfortable with — the path finder and course
          recommendations below both use this list.
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
                  {categorySkills.map((s) => {
                    const known = knownSkills.includes(s.name);
                    return (
                      <button
                        key={s.name}
                        onClick={() => toggleSkillKnown(s.name, !known)}
                        className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                          known
                            ? "border-emerald-600 bg-emerald-600 text-white"
                            : "border-gray-300 dark:border-white/20 hover:bg-gray-100 dark:hover:bg-white/10"
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
      </section>

      <section className="mt-12">
        <h2 className="mb-1 text-lg font-semibold">Courses you&apos;re ready for</h2>
        <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
          Every prerequisite already checked off, and something new left to learn.
        </p>

        {recLoading && <LoadingState label="Matching courses to what you know…" />}
        {recError && <ErrorState message={recError} />}
        {!recLoading && !recError && recommendations && recommendations.length === 0 && (
          <EmptyState
            title="No matches yet"
            description="Mark a few foundational skills as known above — Programming Basics is a good start."
          />
        )}
        {!recLoading && !recError && recommendations && recommendations.length > 0 && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {recommendations.map((course) => (
              <div
                key={course.title}
                className="rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 p-4"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="font-medium">{course.title}</p>
                  <LevelBadge level={course.level} />
                </div>
                <p className="mt-1 text-xs text-gray-400">
                  {course.provider} · {course.hours}h
                </p>
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{course.description}</p>
                <p className="mt-2 text-xs text-gray-400">
                  Teaches:{" "}
                  {course.teachesSkills.map((s, i) => (
                    <span key={s}>
                      {i > 0 && ", "}
                      <Link href={`/skills/${encodeURIComponent(s)}`} className="hover:underline">
                        {s}
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
