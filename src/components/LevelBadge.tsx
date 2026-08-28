import type { Level } from "@/lib/types";

const STYLES: Record<Level, string> = {
  beginner: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
  intermediate: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  advanced: "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300",
};

export function LevelBadge({ level }: { level: Level }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${STYLES[level]}`}
    >
      {level}
    </span>
  );
}
