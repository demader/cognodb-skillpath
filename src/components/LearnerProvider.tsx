"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

interface Identity {
  email: string;
  name: string;
}

interface LearnerContextValue {
  email: string;
  name: string;
  knownSkills: string[];
  targetRole: string | null;
  /** True until the learner's graph state has been fetched at least once. */
  loading: boolean;
  /** True when the last sync with CognoDB failed. */
  offline: boolean;
  setName: (name: string) => void;
  toggleSkillKnown: (skillName: string, known: boolean) => Promise<void>;
  setTargetRole: (roleTitle: string | null) => Promise<void>;
  refresh: () => Promise<void>;
}

const LearnerContext = createContext<LearnerContextValue | null>(null);

const EMAIL_KEY = "skillpath.learnerEmail";
const NAME_KEY = "skillpath.learnerName";

function guestEmail(): string {
  const id =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10);
  return `guest-${id}@skillpath.local`;
}

export function LearnerProvider({ children }: { children: ReactNode }) {
  const [identity, setIdentity] = useState<Identity | null>(null);
  const [knownSkills, setKnownSkills] = useState<string[]>([]);
  const [targetRole, setTargetRoleState] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [offline, setOffline] = useState(false);

  const fetchState = useCallback(async (email: string) => {
    try {
      const res = await fetch(`/api/learner?email=${encodeURIComponent(email)}`);
      if (!res.ok) throw new Error("learner fetch failed");
      const data = await res.json();
      setKnownSkills(data.knownSkills ?? []);
      setTargetRoleState(data.targetRole ?? null);
      setOffline(false);
    } catch {
      // CognoDB unreachable — pages render their own error states; keep local state.
      setOffline(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // localStorage is client-only, so the guest identity can't be resolved during
    // server rendering — this one-time bootstrap has to happen after mount.
    let storedEmail = localStorage.getItem(EMAIL_KEY);
    if (!storedEmail) {
      storedEmail = guestEmail();
      localStorage.setItem(EMAIL_KEY, storedEmail);
    }
    const storedName = localStorage.getItem(NAME_KEY) ?? "Guest learner";
    // eslint-disable-next-line react-hooks/set-state-in-effect -- syncing React state with the localStorage-backed identity on first client render; there is no earlier point to read it.
    setIdentity({ email: storedEmail, name: storedName });
    fetchState(storedEmail);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fetchState is stable; this must run exactly once on mount.
  }, []);

  const refresh = useCallback(async () => {
    if (identity) await fetchState(identity.email);
  }, [identity, fetchState]);

  const setName = useCallback((newName: string) => {
    setIdentity((prev) => (prev ? { ...prev, name: newName } : prev));
    localStorage.setItem(NAME_KEY, newName);
  }, []);

  /** Optimistic toggle: update the UI immediately, then persist the KNOWS edge. */
  const toggleSkillKnown = useCallback(
    async (skillName: string, known: boolean) => {
      if (!identity) return;
      const previous = knownSkills;
      setKnownSkills((prev) =>
        known ? [...new Set([...prev, skillName])] : prev.filter((s) => s !== skillName)
      );
      try {
        const res = await fetch("/api/learner/skills", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: identity.email, name: identity.name, skillName, known }),
        });
        if (!res.ok) throw new Error("write failed");
        const data = await res.json();
        setKnownSkills(data.knownSkills ?? []);
        setOffline(false);
      } catch {
        setKnownSkills(previous); // roll back so the UI never lies about saved state
        setOffline(true);
      }
    },
    [identity, knownSkills]
  );

  const setTargetRole = useCallback(
    async (roleTitle: string | null) => {
      if (!identity) return;
      const previous = targetRole;
      setTargetRoleState(roleTitle);
      try {
        const res = await fetch("/api/learner/target", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: identity.email, name: identity.name, roleTitle }),
        });
        if (!res.ok) throw new Error("write failed");
        setOffline(false);
      } catch {
        setTargetRoleState(previous);
        setOffline(true);
      }
    },
    [identity, targetRole]
  );

  const value = useMemo(
    () => ({
      email: identity?.email ?? "",
      name: identity?.name ?? "Guest learner",
      knownSkills,
      targetRole,
      loading,
      offline,
      setName,
      toggleSkillKnown,
      setTargetRole,
      refresh,
    }),
    [identity, knownSkills, targetRole, loading, offline, setName, toggleSkillKnown, setTargetRole, refresh]
  );

  return <LearnerContext.Provider value={value}>{children}</LearnerContext.Provider>;
}

export function useLearner() {
  const ctx = useContext(LearnerContext);
  if (!ctx) throw new Error("useLearner must be used within a LearnerProvider");
  return ctx;
}
