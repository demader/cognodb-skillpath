import Link from "next/link";
import type { ChainSkill } from "@/lib/types";
import { LevelBadge } from "./LevelBadge";

/** Renders the multi-hop ancestor chain as rows from most-foundational down to the target. */
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
        This is a foundational skill — it has no prerequisites.
      </p>
    );
  }

  const byDepth = new Map<number, ChainSkill[]>();
  for (const skill of chain) {
    const bucket = byDepth.get(skill.depth) ?? [];
    bucket.push(skill);
    byDepth.set(skill.depth, bucket);
  }
  const depths = [...byDepth.keys()].sort((a, b) => b - a);

  return (
    <div className="flex flex-col gap-3">
      {depths.map((depth, i) => (
        <div key={depth} className="flex flex-col gap-2">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
            {depth} hop{depth === 1 ? "" : "s"} before {targetName}
          </p>
          <div className="flex flex-wrap gap-2">
            {byDepth.get(depth)!.map((skill) => (
              <Link
                key={skill.name}
                href={`/skills/${encodeURIComponent(skill.name)}`}
                className="flex items-center gap-2 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 px-3 py-1.5 text-sm hover:border-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-500/10"
              >
                {skill.name}
                <LevelBadge level={skill.level} />
              </Link>
            ))}
          </div>
          {i < depths.length - 1 && (
            <div className="ml-3 h-4 border-l-2 border-dashed border-gray-300 dark:border-white/15" />
          )}
        </div>
      ))}
      <div className="ml-3 h-4 border-l-2 border-dashed border-gray-300 dark:border-white/15" />
      <div className="flex items-center gap-2 rounded-lg border-2 border-indigo-500 bg-indigo-50 dark:bg-indigo-500/10 px-3 py-1.5 text-sm font-medium w-fit">
        🎯 {targetName}
      </div>
    </div>
  );
}
