"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const LINKS = [
  { href: "/", label: "Home" },
  { href: "/skills", label: "Explore Skills" },
  { href: "/path", label: "Path Finder" },
  { href: "/profile", label: "My Profile" },
];

export function Nav() {
  const pathname = usePathname();
  const [connected, setConnected] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      try {
        const res = await fetch("/api/health", { cache: "no-store" });
        if (!cancelled) setConnected(res.ok);
      } catch {
        if (!cancelled) setConnected(false);
      }
    };
    check();
    const interval = setInterval(check, 30_000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  return (
    <header className="border-b border-black/10 dark:border-white/10 bg-white/80 dark:bg-black/40 backdrop-blur sticky top-0 z-20">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
        <Link href="/" className="flex items-center gap-2 font-semibold text-lg tracking-tight">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-indigo-500" />
          SkillPath
        </Link>
        <nav className="flex items-center gap-1 sm:gap-2">
          {LINKS.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  active
                    ? "bg-indigo-600 text-white"
                    : "text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/10"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
        <div className="hidden sm:flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
          <span
            className={`h-2 w-2 rounded-full ${
              connected === null
                ? "bg-gray-300 animate-pulse"
                : connected
                ? "bg-emerald-500"
                : "bg-rose-500"
            }`}
          />
          {connected === null ? "Checking DB…" : connected ? "CognoDB connected" : "CognoDB unreachable"}
        </div>
      </div>
    </header>
  );
}
