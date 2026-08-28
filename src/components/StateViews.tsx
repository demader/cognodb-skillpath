export function LoadingState({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-gray-500 dark:text-gray-400">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
      <p className="text-sm">{label}</p>
    </div>
  );
}

export function EmptyState({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-gray-300 dark:border-white/15 py-16 text-center">
      <p className="font-medium text-gray-700 dark:text-gray-200">{title}</p>
      {description && <p className="max-w-sm text-sm text-gray-500 dark:text-gray-400">{description}</p>}
    </div>
  );
}

export function ErrorState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-rose-200 bg-rose-50 dark:border-rose-900/40 dark:bg-rose-900/10 py-16 text-center">
      <p className="font-medium text-rose-700 dark:text-rose-300">CognoDB is unreachable</p>
      <p className="max-w-sm text-sm text-rose-600/80 dark:text-rose-300/70">{message}</p>
    </div>
  );
}
