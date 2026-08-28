/**
 * Integration specs — these run against the real CognoDB instance named in
 * .env.local, because the business logic of this app *is* the Cypher. Mocking the
 * driver would only assert that the query strings haven't changed.
 *
 * Assumes the graph has been seeded (`npm run seed`). Writes are confined to a
 * throwaway learner that is deleted in afterAll.
 *
 * Note on structure: each block fetches its data once in `beforeAll` and the specs
 * assert against that snapshot. A round trip to the free c0 tier costs ~800ms, and
 * the tier is burstable — re-running the same traversal in every spec exhausts its
 * CPU credits and the suite starts timing out on writes.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { hasDatabase } from "./setup";
import { closeDriver, read, write } from "../src/lib/neo4j";
import * as q from "../src/lib/queries";
import type {
  ChainSkill,
  PathStep,
  RecommendedCourse,
  RoleReadiness,
  SkillDetail,
} from "../src/lib/types";

const describeDb = hasDatabase ? describe : describe.skip;

/** A web-basics starting point, matching the demo learner created by the seed. */
const WEB_BASICS = [
  "Programming Basics",
  "Variables & Control Flow",
  "Functions & Scope",
  "HTML & CSS",
  "JavaScript Basics",
  "Command Line & Linux Basics",
  "Version Control with Git",
];

const TEST_EMAIL = "vitest-learner@skillpath.local";

afterAll(async () => {
  if (hasDatabase) {
    await write("MATCH (l:Learner {email: $email}) DETACH DELETE l", { email: TEST_EMAIL });
  }
  await closeDriver();
});

/* ───────────────────────────── catalog ───────────────────────────── */

describeDb("graph shape", () => {
  let stats: Awaited<ReturnType<typeof q.getGraphStats>>;
  let allSkills: Awaited<ReturnType<typeof q.getSkills>>;
  let categories: string[];

  beforeAll(async () => {
    [stats, allSkills, categories] = await Promise.all([
      q.getGraphStats(),
      q.getSkills(),
      q.getCategories(),
    ]);
  });

  it("is seeded with the expected catalog", () => {
    expect(stats.skills).toBe(48);
    expect(stats.courses).toBe(48);
    expect(stats.roles).toBe(9);
    expect(stats.providers).toBe(13);
    expect(stats.categories).toBe(7);
    expect(stats.relationships).toBeGreaterThan(300);
  });

  it("returns integers as JavaScript numbers, not Bolt {low, high} objects", () => {
    // Regression: without disableLosslessIntegers every sum and comparison in the
    // app breaks silently — totals become string concatenations or NaN.
    expect(typeof stats.totalHours).toBe("number");
    expect(Number.isInteger(stats.totalHours)).toBe(true);
    expect(stats.totalHours).toBeGreaterThan(0);
    expect(typeof allSkills[0].courseCount).toBe("number");
    expect(typeof allSkills[0].roleCount).toBe("number");
  });

  it("lists every skill with its category", () => {
    expect(allSkills).toHaveLength(48);
    expect(allSkills.every((s) => typeof s.category === "string" && s.category.length > 0)).toBe(
      true
    );
    expect(categories).toContain("Data Science & ML");
  });

  it("filters skills by category", async () => {
    const filtered = await q.getSkills("Data Science & ML");
    expect(filtered.length).toBeGreaterThan(0);
    expect(filtered.length).toBeLessThan(allSkills.length);
    expect(filtered.every((s) => s.category === "Data Science & ML")).toBe(true);
  });
});

/* ──────────────────── multi-hop prerequisite chain ──────────────────── */

describeDb("prerequisite chain (multi-hop traversal)", () => {
  let chain: ChainSkill[];

  beforeAll(async () => {
    chain = await q.getPrerequisiteChain("Computer Vision");
  });

  it("walks the full ancestry, not just direct parents", () => {
    const names = chain.map((c) => c.name);
    expect(names).toContain("Deep Learning"); // 1 hop
    expect(names).toContain("Variables & Control Flow"); // deepest
    expect(Math.max(...chain.map((c) => c.depth))).toBeGreaterThanOrEqual(5);
  });

  it("reports depth as the shortest distance to the target", () => {
    expect(chain.find((c) => c.name === "Deep Learning")?.depth).toBe(1);
  });

  it("marks a skill blocking when an all-hard chain exists", () => {
    // Regression: max() does not order booleans in CognoDB, so the original
    // max(CASE WHEN ... THEN true ELSE false END) silently returned false and
    // these two were shown as optional when they are in fact required.
    expect(chain.find((c) => c.name === "Statistics Fundamentals")?.blocking).toBe(true);
    expect(chain.find((c) => c.name === "Programming Basics")?.blocking).toBe(true);
  });

  it("marks a skill non-blocking when every route uses a recommended edge", () => {
    const recursion = chain.find((c) => c.name === "Recursion");
    expect(recursion).toBeDefined();
    expect(recursion?.blocking).toBe(false);
  });

  it("reports a depth that belongs to the same path as the blocking flag", async () => {
    // Regression: min(length(path)) and the blocking flag were independent
    // aggregates over the same path set, so a row could pair the length of a
    // *recommended* route with a blocking flag earned by a different, longer one.
    // Variables & Control Flow reaches React in 2 hops only via a recommended
    // edge; its shortest all-hard route is 3 hops.
    const react = await q.getPrerequisiteChain("Frontend Frameworks (React)");
    const variables = react.find((c) => c.name === "Variables & Control Flow")!;

    expect(variables.blocking).toBe(true);
    expect(variables.depth).toBe(3);
  });

  it("returns nothing for a foundational skill or an unknown one", async () => {
    const [foundational, missing] = await Promise.all([
      q.getPrerequisiteChain("Programming Basics"),
      q.getPrerequisiteChain("Not A Real Skill"),
    ]);
    expect(foundational).toEqual([]);
    expect(missing).toEqual([]);
  });
});

/* ───────────────────────── skill neighbourhood ───────────────────────── */

describeDb("skill detail", () => {
  let ml: SkillDetail;
  let cv: SkillDetail;

  beforeAll(async () => {
    const [a, b] = await Promise.all([
      q.getSkillDetail("Machine Learning Fundamentals"),
      q.getSkillDetail("Computer Vision"),
    ]);
    ml = a!;
    cv = b!;
  });

  it("reads the whole neighbourhood in one call", () => {
    expect(ml.skill.category).toBe("Data Science & ML");
    expect(ml.directPrerequisites.map((s) => s.name)).toContain("Algorithms");
    expect(ml.directDependents.map((s) => s.name)).toContain("Deep Learning");
    expect(ml.teachingCourses.length).toBeGreaterThan(0);
    expect(ml.neededByRoles.map((r) => r.title)).toContain("Machine Learning Engineer");
  });

  it("carries the strength of each prerequisite edge", () => {
    expect(ml.directPrerequisites.find((s) => s.name === "Linear Algebra")?.strength).toBe(
      "recommended"
    );
    expect(ml.directPrerequisites.find((s) => s.name === "Algorithms")?.strength).toBe("hard");
  });

  it("carries the importance of each role that needs the skill", () => {
    expect(ml.neededByRoles.find((r) => r.title === "Machine Learning Engineer")?.importance).toBe(
      "core"
    );
    expect(ml.neededByRoles.find((r) => r.title === "Data Analyst")?.importance).toBe(
      "nice-to-have"
    );
  });

  it("never leaks null placeholder rows from OPTIONAL MATCH", () => {
    // Computer Vision has no dependents — the case where OPTIONAL MATCH yields a
    // single all-null map that has to be filtered out before rendering.
    expect(cv.directDependents).toEqual([]);
    for (const list of [
      cv.directPrerequisites,
      cv.directDependents,
      cv.teachingCourses,
      cv.requiringCourses,
      cv.neededByRoles,
    ]) {
      expect(list.every((item) => Object.values(item).every((v) => v != null))).toBe(true);
    }
  });

  it("returns null for a skill that does not exist", async () => {
    expect(await q.getSkillDetail("Not A Real Skill")).toBeNull();
  });
});

/* ──────────────────────────────── roles ──────────────────────────────── */

describeDb("roles", () => {
  let roles: Awaited<ReturnType<typeof q.getRoles>>;
  let mlNeeds: Awaited<ReturnType<typeof q.getRoleNeeds>>;

  beforeAll(async () => {
    [roles, mlNeeds] = await Promise.all([
      q.getRoles(),
      q.getRoleNeeds("Machine Learning Engineer"),
    ]);
  });

  it("lists roles with their core-skill counts", () => {
    expect(roles).toHaveLength(9);
    expect(roles.every((r) => r.coreSkills > 0)).toBe(true);
  });

  it("separates core from nice-to-have needs", () => {
    const core = mlNeeds!.filter((n) => n.importance === "core").map((n) => n.name);
    const nice = mlNeeds!.filter((n) => n.importance === "nice-to-have").map((n) => n.name);

    expect(core).toContain("Deep Learning");
    expect(core).toContain("MLOps");
    expect(nice).toContain("Computer Vision");
    expect(core.some((n) => nice.includes(n))).toBe(false);
  });

  it("returns null for a role that does not exist", async () => {
    expect(await q.getRoleNeeds("Chief Vibes Officer")).toBeNull();
  });
});

describeDb("role readiness", () => {
  let readiness: RoleReadiness[];

  beforeAll(async () => {
    readiness = await q.getRoleReadiness(WEB_BASICS);
  });

  it("scores every role and ranks the closest first", () => {
    expect(readiness).toHaveLength(9);
    for (let i = 1; i < readiness.length; i++) {
      expect(readiness[i - 1].readiness).toBeGreaterThanOrEqual(readiness[i].readiness);
    }
    expect(readiness[0].role.title).toBe("Frontend Engineer");
  });

  it("agrees with its own counts", () => {
    for (const entry of readiness) {
      expect(entry.coreKnown).toBeLessThanOrEqual(entry.coreSkills);
      expect(entry.missingCore).toHaveLength(entry.coreSkills - entry.coreKnown);
    }
  });

  it("rounds readiness the same way the role page does", () => {
    // The role page recomputes this client-side with Math.round; if the query
    // truncates instead, the same role shows two different percentages.
    for (const entry of readiness) {
      expect(entry.readiness).toBe(Math.round((entry.coreKnown / entry.coreSkills) * 100));
    }
  });

  it("rounds rather than truncates on a fractional boundary", async () => {
    // Regression: 1 of Frontend Engineer's 6 core skills is 16.67%. toInteger()
    // truncated that to 16 while the role page rounded to 17, so the same role
    // reported two different percentages depending on which page you opened.
    const partial = await q.getRoleReadiness(["HTML & CSS"]);
    const frontend = partial.find((r) => r.role.title === "Frontend Engineer")!;

    expect(frontend.coreKnown).toBe(1);
    expect(frontend.coreSkills).toBe(6);
    expect(frontend.readiness).toBe(17);
  });

  it("reports zero readiness for an empty known-set", async () => {
    const cold = await q.getRoleReadiness([]);
    expect(cold.every((r) => r.readiness === 0 && r.coreKnown === 0)).toBe(true);
  });
});

/* ───────────────────────────── path to a role ───────────────────────────── */

describeDb("path to a role", () => {
  let path: PathStep[];

  beforeAll(async () => {
    path = (await q.getPathToRole("Machine Learning Engineer", WEB_BASICS))!;
    expect(path).not.toBeNull();
  });

  it("returns every missing core skill plus the prerequisites they pull in", () => {
    const names = path.map((s) => s.skill.name);
    expect(names).toContain("Deep Learning"); // the role's own requirement
    expect(names).toContain("MLOps");
    expect(names).toContain("Statistics Fundamentals"); // dragged in by the traversal
    expect(names).toContain("Data Structures");
  });

  it("never includes a skill the learner already knows", () => {
    const names = path.map((s) => s.skill.name);
    for (const known of WEB_BASICS) expect(names).not.toContain(known);
  });

  it("is ordered so no step is blocked by a later one", () => {
    // The core promise of the feature: unmetPrerequisites must never decrease as
    // you read down the list, so the plan is walkable top to bottom.
    for (let i = 1; i < path.length; i++) {
      expect(path[i].unmetPrerequisites).toBeGreaterThanOrEqual(path[i - 1].unmetPrerequisites);
    }
    expect(path[0].unmetPrerequisites).toBe(0);
  });

  it("flags which steps are the role's own requirements", () => {
    const goals = path.filter((s) => s.isGoal).map((s) => s.skill.name);
    expect(goals).toContain("Deep Learning");
    expect(goals).not.toContain("Statistics Fundamentals"); // a prerequisite, not a requirement
  });

  it("never lists a skill as unlocking itself", () => {
    for (const step of path) {
      expect(step.unlocks ?? []).not.toContain(step.skill.name);
    }
  });

  it("recommends the shortest course that primarily teaches each step", () => {
    const step = path.find((s) => s.skill.name === "Deep Learning")!;
    expect(step.recommendedCourse?.title).toBe("Deep Learning Specialization");
    expect(step.recommendedCourse?.provider).toBe("Coursera");
    expect(typeof step.recommendedCourse?.hours).toBe("number");
  });

  it("gives every step a course to take", () => {
    // A step with no course is a dead end the learner cannot action.
    const deadEnds = path.filter((s) => !s.recommendedCourse).map((s) => s.skill.name);
    expect(deadEnds).toEqual([]);
  });

  it("is complete: finishing it leaves nothing left to learn", async () => {
    const after = await q.getPathToRole("Machine Learning Engineer", [
      ...WEB_BASICS,
      ...path.map((s) => s.skill.name),
    ]);
    expect(after).toEqual([]);
  });

  it("shrinks as the learner learns more", async () => {
    const after = await q.getPathToRole("Machine Learning Engineer", [
      ...WEB_BASICS,
      "Statistics Fundamentals",
      "Data Structures",
    ]);
    expect(after!.length).toBe(path.length - 2);
  });

  it("grows when nice-to-have skills are included", async () => {
    const withNice = await q.getPathToRole("Machine Learning Engineer", WEB_BASICS, true);
    expect(withNice!.length).toBeGreaterThan(path.length);
    expect(withNice!.map((s) => s.skill.name)).toContain("Computer Vision");
  });

  it("badges only core skills as role requirements, even with nice-to-haves on", async () => {
    // Regression: isGoal was "is any goal skill", so with includeNiceToHave the
    // nice-to-have skills rendered the indigo "role requirement" badge, directly
    // contradicting the Core / Nice-to-have split shown above it on the same page.
    const withNice = await q.getPathToRole("Machine Learning Engineer", WEB_BASICS, true);
    const badged = withNice!.filter((s) => s.isGoal).map((s) => s.skill.name);

    expect(badged).toContain("Deep Learning"); // core
    expect(badged).not.toContain("Computer Vision"); // nice-to-have
  });

  it("distinguishes a role that does not exist from a role already achieved", async () => {
    // An empty array means "nothing left to learn"; null means "no such role".
    // Conflating them made a typo'd target render "You're already ready 🎉".
    expect(await q.getPathToRole("Chief Vibes Officer", [])).toBeNull();
  });
});

/* ──────────────────────────── path to a skill ──────────────────────────── */

describeDb("path to a single skill", () => {
  let path: PathStep[];

  beforeAll(async () => {
    path = (await q.getPathToSkill("Computer Vision", WEB_BASICS))!;
    expect(path).not.toBeNull();
  });

  it("includes the target itself, last, since it depends on everything else", () => {
    expect(path.map((s) => s.skill.name)).toContain("Computer Vision");
    expect(path.at(-1)!.skill.name).toBe("Computer Vision");
  });

  it("is ordered so no step is blocked by a later one", () => {
    for (let i = 1; i < path.length; i++) {
      expect(path[i].unmetPrerequisites).toBeGreaterThanOrEqual(path[i - 1].unmetPrerequisites);
    }
  });

  it("excludes recommended-only prerequisites", () => {
    // Recursion reaches Computer Vision solely through a 'recommended' edge, so it
    // must not appear in a path that only follows blocking prerequisites.
    expect(path.map((s) => s.skill.name)).not.toContain("Recursion");
  });

  it("returns an empty path for a skill already known", async () => {
    expect(await q.getPathToSkill("HTML & CSS", WEB_BASICS)).toEqual([]);
  });

  it("returns the whole ancestry from a cold start", async () => {
    const cold = await q.getPathToSkill("Deep Learning", []);
    expect(cold![0].skill.name).toBe("Programming Basics");
    expect(cold!.at(-1)!.skill.name).toBe("Deep Learning");
  });

  it("returns null for a skill that does not exist", async () => {
    expect(await q.getPathToSkill("Telekinesis", [])).toBeNull();
  });
});

/* ───────────────────────── course recommendations ───────────────────────── */

describeDb("course recommendations", () => {
  let recs: RecommendedCourse[];

  beforeAll(async () => {
    recs = await q.getRecommendedCourses(WEB_BASICS);
  });

  it("only suggests courses whose prerequisites are all met", () => {
    expect(recs.length).toBeGreaterThan(0);
    for (const course of recs) {
      for (const required of course.requiredSkills) expect(WEB_BASICS).toContain(required);
    }
  });

  it("only suggests courses that teach something new", () => {
    for (const course of recs) {
      expect(course.newSkills.length).toBeGreaterThan(0);
      for (const skill of course.newSkills) expect(WEB_BASICS).not.toContain(skill);
    }
  });

  it("orders by ascending hours so the quickest win is first", () => {
    for (let i = 1; i < recs.length; i++) {
      expect(recs[i].hours).toBeGreaterThanOrEqual(recs[i - 1].hours);
    }
  });

  it("suggests only zero-prerequisite courses for a brand-new learner", async () => {
    const cold = await q.getRecommendedCourses([]);
    expect(cold.length).toBeGreaterThan(0);
    expect(cold.every((c) => c.requiredSkills.length === 0)).toBe(true);
  });
});

/* ──────────────────────────── learner state ──────────────────────────── */

describeDb("learner state", () => {
  it("records, deduplicates and removes known skills", async () => {
    await q.setSkillKnown(TEST_EMAIL, "Vitest Learner", "Programming Basics", true);
    await q.setSkillKnown(TEST_EMAIL, "Vitest Learner", "SQL Fundamentals", true);
    // marking the same skill twice must not create a second KNOWS edge
    await q.setSkillKnown(TEST_EMAIL, "Vitest Learner", "Programming Basics", true);

    expect(await q.getKnownSkillNames(TEST_EMAIL)).toEqual([
      "Programming Basics",
      "SQL Fundamentals",
    ]);

    await q.setSkillKnown(TEST_EMAIL, "Vitest Learner", "SQL Fundamentals", false);
    expect(await q.getKnownSkillNames(TEST_EMAIL)).toEqual(["Programming Basics"]);
  });

  it("keeps at most one target role", async () => {
    await q.setTargetRole(TEST_EMAIL, "Vitest Learner", "Data Analyst");
    expect(await q.getTargetRole(TEST_EMAIL)).toBe("Data Analyst");

    await q.setTargetRole(TEST_EMAIL, "Vitest Learner", "Backend Engineer");
    expect(await q.getTargetRole(TEST_EMAIL)).toBe("Backend Engineer");

    await q.setTargetRole(TEST_EMAIL, "Vitest Learner", null);
    expect(await q.getTargetRole(TEST_EMAIL)).toBeNull();
  });

  it("returns an empty set for a learner that has never been seen", async () => {
    const [known, target] = await Promise.all([
      q.getKnownSkillNames("nobody@skillpath.local"),
      q.getTargetRole("nobody@skillpath.local"),
    ]);
    expect(known).toEqual([]);
    expect(target).toBeNull();
  });

  it("reports failure rather than silently ignoring an unknown skill", async () => {
    // Regression: the MATCH simply dropped the row, so the API answered 200 with
    // an unchanged list and the UI's optimistic tick un-ticked itself with no error.
    const applied = await q.setSkillKnown(TEST_EMAIL, "Vitest Learner", "Telekinesis", true);
    expect(applied).toBe(false);
    expect(await q.getKnownSkillNames(TEST_EMAIL)).not.toContain("Telekinesis");
  });

  it("does not create a learner when the skill does not exist", async () => {
    const ghost = "ghost@skillpath.local";
    expect(await q.setSkillKnown(ghost, "Ghost", "Telekinesis", true)).toBe(false);

    const rows = await read<{ found: number }>(
      "MATCH (l:Learner {email: $email}) RETURN count(l) AS found",
      { email: ghost }
    );
    expect(rows[0].found).toBe(0);
  });

  it("keeps the existing target when asked to switch to a role that does not exist", async () => {
    // Regression: the old statement deleted the current TARGETS edge before
    // checking the new role existed, destroying a valid target and returning 200.
    await q.setTargetRole(TEST_EMAIL, "Vitest Learner", "Data Analyst");

    const applied = await q.setTargetRole(TEST_EMAIL, "Vitest Learner", "Chief Vibes Officer");
    expect(applied).toBe(false);
    expect(await q.getTargetRole(TEST_EMAIL)).toBe("Data Analyst");

    await q.setTargetRole(TEST_EMAIL, "Vitest Learner", null);
  });
});
