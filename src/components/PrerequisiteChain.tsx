import Link from "next/link";
import type { ChainSkill } from "@/lib/types";
import { LevelBadge } from "./LevelBadge";

/**
 * Renders the multi-hop ancestor chain grouped by hop-distance, deepest first,
 * so the reader sees the actual shape of the traversal rather than a flat list.
 */
export function PrerequisiteChain({
  chain,
  targetName,
}: {
  chain: ChainSkill[];
  targetName: string;
}) {
  if (chain.length === 0) {
    return (
      <p className="text-sm text-gray-500 dark:text-gray-400">
        This is a foundational skill — nothing needs to come before it.
      </p>
    );
  }

  const byDepth = new Map<number, ChainSkill[]>();
  for (const skill of chain) {
    byDepth.set(skill.depth, [...(byDepth.get(skill.depth) ?? []), skill]);
  }
  const depths = [...byDepth.keys()].sort((a, b) => b - a);

  return (
    <div className="flex flex-col">
      {depths.map((depth) => (
        <div key={depth}>
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-400">
            {depth} hop{depth === 1 ? "" : "s"} away
          </p>
          <div className="flex flex-wrap gap-2">
            {byDepth.get(depth)!.map((skill) => (
              <Link
                key={skill.name}
                href={`/skills/${encodeURIComponent(skill.name)}`}
                title={
                  skill.blocking
                    ? "Blocking prerequisite — required before the target"
                    : "Recommended only — helpful but not required"
                }
                className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm transition-colors hover:border-indigo-300 ${
                  skill.blocking
                    ? "border-gray-200 bg-white dark:border-white/10 dark:bg-white/5"
                    : "border-dashed border-gray-300 bg-gray-50 dark:border-white/15 dark:bg-white/[0.02]"
                }`}
              >
                {skill.name}
                <LevelBadge level={skill.level} />
              </Link>
            ))}
          </div>
          <div className="my-2 ml-3 h-4 border-l-2 border-dashed border-gray-300 dark:border-white/15" />
        </div>
      ))}

      <div className="flex w-fit items-center gap-2 rounded-lg border-2 border-indigo-500 bg-indigo-50 px-3 py-1.5 text-sm font-medium dark:bg-indigo-500/10">
        🎯 {targetName}
      </div>

      <p className="mt-4 text-xs text-gray-400">
        Solid borders are blocking prerequisites; dashed borders are recommended only.
      </p>
    </div>
  );
}
