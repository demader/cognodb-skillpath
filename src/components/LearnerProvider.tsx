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
  loading: boolean;
  setName: (name: string) => void;
  toggleSkillKnown: (skillName: string, known: boolean) => Promise<void>;
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
  const [loading, setLoading] = useState(true);

  const fetchKnownSkills = useCallback(async (email: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/learner?email=${encodeURIComponent(email)}`);
      if (res.ok) {
        const data = await res.json();
        setKnownSkills(data.knownSkills ?? []);
      }
    } catch {
      // Offline / DB down: leave knownSkills as-is, pages surface their own error states.
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // localStorage only exists client-side, so the guest identity can't be resolved
    // during server rendering — this one-time bootstrap has to happen post-mount.
    let storedEmail = localStorage.getItem(EMAIL_KEY);
    if (!storedEmail) {
      storedEmail = guestEmail();
      localStorage.setItem(EMAIL_KEY, storedEmail);
    }
    const storedName = localStorage.getItem(NAME_KEY) ?? "Guest learner";
    // eslint-disable-next-line react-hooks/set-state-in-effect -- syncing React state with the localStorage-backed identity on first client render; there is no earlier point to read it from.
    setIdentity({ email: storedEmail, name: storedName });
    fetchKnownSkills(storedEmail);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fetchKnownSkills is stable (empty dep array); this effect should only run once on mount.
  }, []);

  const refresh = useCallback(async () => {
    if (identity) await fetchKnownSkills(identity.email);
  }, [identity, fetchKnownSkills]);

  const setName = useCallback((newName: string) => {
    setIdentity((prev) => (prev ? { ...prev, name: newName } : prev));
    localStorage.setItem(NAME_KEY, newName);
  }, []);

  const toggleSkillKnown = useCallback(
    async (skillName: string, known: boolean) => {
      if (!identity) return;
      setKnownSkills((prev) =>
        known ? [...new Set([...prev, skillName])] : prev.filter((s) => s !== skillName)
      );
      await fetch("/api/learner/skills", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: identity.email, name: identity.name, skillName, known }),
      }).catch(() => {});
    },
    [identity]
  );

  const value = useMemo(
    () => ({
      email: identity?.email ?? "",
      name: identity?.name ?? "Guest learner",
      knownSkills,
      loading,
      setName,
      toggleSkillKnown,
      refresh,
    }),
    [identity, knownSkills, loading, setName, toggleSkillKnown, refresh]
  );

  return <LearnerContext.Provider value={value}>{children}</LearnerContext.Provider>;
}

export function useLearner() {
  const ctx = useContext(LearnerContext);
  if (!ctx) throw new Error("useLearner must be used within a LearnerProvider");
  return ctx;
}
