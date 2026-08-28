"use client";

import { useLearner } from "./LearnerProvider";

export function KnowToggle({ skillName }: { skillName: string }) {
  const { knownSkills, toggleSkillKnown, loading } = useLearner();
  const known = knownSkills.includes(skillName);

  return (
    <button
      onClick={() => toggleSkillKnown(skillName, !known)}
      disabled={loading}
      className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50 ${
        known
          ? "bg-emerald-600 text-white hover:bg-emerald-500"
          : "border border-gray-300 dark:border-white/20 hover:bg-gray-100 dark:hover:bg-white/10"
      }`}
    >
      {known ? "✓ You know this skill" : "Mark as known"}
    </button>
  );
}
