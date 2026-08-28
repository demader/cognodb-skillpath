/**
 * Pure integrity checks on the source data — no database required.
 *
 * These matter because the seed script resolves every relationship with
 * `MATCH (a {...}), (b {...}) CREATE ...`. A typo in a skill name doesn't error:
 * the MATCH simply finds nothing and the edge is silently never created. These
 * specs turn that silent data loss into a failing test.
 */
import { describe, expect, it } from "vitest";
import { categories, courses, providers, roles, skills } from "../scripts/seed-data";

const skillNames = new Set(skills.map((s) => s.name));
const categoryNames = new Set(categories);
const courseTitles = new Set(courses.map((c) => c.title));

describe("skills", () => {
  it("have unique names", () => {
    expect(skillNames.size).toBe(skills.length);
  });

  it("belong to a category that exists", () => {
    const orphans = skills.filter((s) => !categoryNames.has(s.category));
    expect(orphans.map((s) => s.name)).toEqual([]);
  });

  it("reference only prerequisite skills that exist", () => {
    const dangling = skills.flatMap((s) =>
      [...(s.prerequisites ?? []), ...(s.recommended ?? [])]
        .filter((p) => !skillNames.has(p))
        .map((p) => `${s.name} -> ${p}`)
    );
    expect(dangling).toEqual([]);
  });

  it("are never their own prerequisite", () => {
    const selfRefs = skills.filter((s) =>
      [...(s.prerequisites ?? []), ...(s.recommended ?? [])].includes(s.name)
    );
    expect(selfRefs.map((s) => s.name)).toEqual([]);
  });

  it("do not list the same prerequisite as both hard and recommended", () => {
    const conflicts = skills.flatMap((s) => {
      const hard = new Set(s.prerequisites ?? []);
      return (s.recommended ?? []).filter((r) => hard.has(r)).map((r) => `${s.name} <- ${r}`);
    });
    expect(conflicts).toEqual([]);
  });

  it("form an acyclic hard-prerequisite graph", () => {
    // A cycle would make "what must I learn first" unanswerable. Depth-first
    // search over hard edges only, tracking the current stack.
    const hardEdges = new Map(skills.map((s) => [s.name, s.prerequisites ?? []]));
    const state = new Map<string, "visiting" | "done">();
    const cycles: string[] = [];

    const visit = (name: string, stack: string[]) => {
      if (state.get(name) === "done") return;
      if (state.get(name) === "visiting") {
        cycles.push([...stack.slice(stack.indexOf(name)), name].join(" -> "));
        return;
      }
      state.set(name, "visiting");
      for (const prereq of hardEdges.get(name) ?? []) visit(prereq, [...stack, name]);
      state.set(name, "done");
    };

    for (const skill of skills) visit(skill.name, []);
    expect(cycles).toEqual([]);
  });
});

describe("courses", () => {
  it("have unique titles", () => {
    expect(courseTitles.size).toBe(courses.length);
  });

  it("teach at least one skill", () => {
    const silent = courses.filter((c) => c.teaches.length === 0);
    expect(silent.map((c) => c.title)).toEqual([]);
  });

  it("reference only skills that exist", () => {
    const dangling = courses.flatMap((c) =>
      [...c.teaches, ...(c.alsoCovers ?? []), ...(c.requires ?? [])]
        .filter((s) => !skillNames.has(s))
        .map((s) => `${c.title} -> ${s}`)
    );
    expect(dangling).toEqual([]);
  });

  it("never require a skill they also teach", () => {
    const circular = courses.flatMap((c) =>
      (c.requires ?? []).filter((r) => c.teaches.includes(r)).map((r) => `${c.title}: ${r}`)
    );
    expect(circular).toEqual([]);
  });

  it("do not list a skill as both primary and partial coverage", () => {
    const overlaps = courses.flatMap((c) =>
      (c.alsoCovers ?? []).filter((s) => c.teaches.includes(s)).map((s) => `${c.title}: ${s}`)
    );
    expect(overlaps).toEqual([]);
  });

  it("have positive hours", () => {
    const bad = courses.filter((c) => !Number.isFinite(c.hours) || c.hours <= 0);
    expect(bad.map((c) => c.title)).toEqual([]);
  });

  it("derive the provider list from the courses themselves", () => {
    expect(new Set(providers)).toEqual(new Set(courses.map((c) => c.provider)));
  });
});

describe("roles", () => {
  it("have unique titles", () => {
    expect(new Set(roles.map((r) => r.title)).size).toBe(roles.length);
  });

  it("need at least one core skill", () => {
    // getRoleReadiness divides by the core count, and a role with none would
    // also never appear in the readiness listing at all.
    const empty = roles.filter((r) => r.core.length === 0);
    expect(empty.map((r) => r.title)).toEqual([]);
  });

  it("reference only skills that exist", () => {
    const dangling = roles.flatMap((r) =>
      [...r.core, ...(r.niceToHave ?? [])]
        .filter((s) => !skillNames.has(s))
        .map((s) => `${r.title} -> ${s}`)
    );
    expect(dangling).toEqual([]);
  });

  it("do not list a skill as both core and nice-to-have", () => {
    const conflicts = roles.flatMap((r) =>
      (r.niceToHave ?? []).filter((s) => r.core.includes(s)).map((s) => `${r.title}: ${s}`)
    );
    expect(conflicts).toEqual([]);
  });
});

describe("catalog coverage", () => {
  it("every skill a role needs is teachable by some course", () => {
    // Otherwise a generated path contains a step the learner can never complete.
    const primarilyTaught = new Set(courses.flatMap((c) => c.teaches));
    const unreachable = [...new Set(roles.flatMap((r) => [...r.core, ...(r.niceToHave ?? [])]))]
      .filter((s) => !primarilyTaught.has(s))
      .sort();
    expect(unreachable).toEqual([]);
  });

  it("every skill is reachable through some course", () => {
    const primarilyTaught = new Set(courses.flatMap((c) => c.teaches));
    const untaught = skills.map((s) => s.name).filter((n) => !primarilyTaught.has(n));
    expect(untaught).toEqual([]);
  });
});
