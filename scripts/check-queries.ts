/**
 * Runs every application query against the live CognoDB instance and prints a
 * sample of each result. Use it after seeding to confirm the graph answers the
 * questions the UI asks of it.
 *
 * Usage: npm run check
 */
import "./load-env";
import { closeDriver } from "../src/lib/neo4j";
import * as q from "../src/lib/queries";

const DEMO_KNOWN = [
  "Programming Basics",
  "Variables & Control Flow",
  "Functions & Scope",
  "HTML & CSS",
  "JavaScript Basics",
  "Command Line & Linux Basics",
  "Version Control with Git",
];

function heading(title: string) {
  console.log(`\n${"─".repeat(70)}\n${title}\n${"─".repeat(70)}`);
}

async function main() {
  heading("Graph stats");
  console.table([await q.getGraphStats()]);

  heading("Categories");
  console.log((await q.getCategories()).join(" · "));

  heading("Skills (first 5 of all)");
  const skills = await q.getSkills();
  console.log(`total: ${skills.length}`);
  console.table(skills.slice(0, 5));

  heading("Skills filtered by category: Data Science & ML");
  const dsSkills = await q.getSkills("Data Science & ML");
  console.log(dsSkills.map((s) => s.name).join(", "));

  heading("Skill detail: Machine Learning Fundamentals");
  const detail = await q.getSkillDetail("Machine Learning Fundamentals");
  if (!detail) {
    console.log("!! not found");
  } else {
    console.log("skill:", detail.skill);
    console.log("direct prerequisites:", detail.directPrerequisites.map((s) => `${s.name} (${s.strength})`));
    console.log("unlocks:", detail.directDependents.map((s) => `${s.name} (${s.strength})`));
    console.log("taught by:", detail.teachingCourses.map((c) => `${c.title} [${c.coverage}] — ${c.provider} ${c.hours}h`));
    console.log("required by courses:", detail.requiringCourses.map((c) => c.title));
    console.log("needed by roles:", detail.neededByRoles.map((r) => `${r.title} (${r.importance})`));
  }

  heading("Skill detail for a non-existent skill (should be null)");
  console.log(await q.getSkillDetail("Definitely Not A Skill"));

  heading("MULTI-HOP: full prerequisite chain for Computer Vision");
  const chain = await q.getPrerequisiteChain("Computer Vision");
  console.table(chain.map((c) => ({ name: c.name, depth: c.depth, blocking: c.blocking })));
  console.log(`max depth reached: ${Math.max(...chain.map((c) => c.depth))} hops`);

  heading("Prerequisite chain for a foundational skill (should be empty)");
  console.log(await q.getPrerequisiteChain("Programming Basics"));

  heading("Roles");
  console.table(await q.getRoles());

  heading("Role needs: Machine Learning Engineer");
  console.table(await q.getRoleNeeds("Machine Learning Engineer"));

  heading("Role needs for unknown role (should be null)");
  console.log(await q.getRoleNeeds("Chief Vibes Officer"));

  heading("Role readiness for the demo learner");
  const readiness = await q.getRoleReadiness(DEMO_KNOWN);
  console.table(
    readiness.map((r) => ({
      role: r.role.title,
      readiness: `${r.readiness}%`,
      core: `${r.coreKnown}/${r.coreSkills}`,
      nice: `${r.niceToHaveKnown}/${r.niceToHaveSkills}`,
      missing: r.missingCore.slice(0, 3).join(", "),
    }))
  );

  heading("FLAGSHIP: path to become a Machine Learning Engineer (demo learner)");
  const rolePath = (await q.getPathToRole("Machine Learning Engineer", DEMO_KNOWN)) ?? [];
  console.table(
    rolePath.map((s, i) => ({
      "#": i + 1,
      skill: s.skill.name,
      unmet: s.unmetPrerequisites,
      goal: s.isGoal ? "★" : "",
      course: s.recommendedCourse ? `${s.recommendedCourse.title} (${s.recommendedCourse.hours}h)` : "—",
      unlocks: (s.unlocks ?? []).join(", ").slice(0, 34),
    }))
  );
  const totalHours = rolePath.reduce((sum, s) => sum + (s.recommendedCourse?.hours ?? 0), 0);
  console.log(`steps: ${rolePath.length}, total coursework: ${totalHours}h (typeof = ${typeof totalHours})`);

  heading("Path to a single skill: Computer Vision (demo learner)");
  const skillPath = (await q.getPathToSkill("Computer Vision", DEMO_KNOWN)) ?? [];
  console.table(
    skillPath.map((s, i) => ({
      "#": i + 1,
      skill: s.skill.name,
      unmet: s.unmetPrerequisites,
      course: s.recommendedCourse?.title ?? "—",
    }))
  );

  heading("Path to a skill the learner already knows (should be empty)");
  console.log(await q.getPathToSkill("HTML & CSS", DEMO_KNOWN));

  heading("Path with an empty known-set (cold start)");
  const coldPath = (await q.getPathToSkill("Deep Learning", [])) ?? [];
  console.log(`${coldPath.length} steps, first: ${coldPath[0]?.skill.name}, last: ${coldPath.at(-1)?.skill.name}`);

  heading("Courses the demo learner is ready for");
  const recs = await q.getRecommendedCourses(DEMO_KNOWN);
  console.table(
    recs.slice(0, 8).map((c) => ({
      title: c.title,
      provider: c.provider,
      hours: c.hours,
      new: c.newSkills.join(", "),
    }))
  );
  console.log(`total ready-to-start courses: ${recs.length}`);

  heading("Learner round-trip (write → read → write)");
  const testEmail = "query-check@skillpath.local";
  await q.setSkillKnown(testEmail, "Query Check", "Programming Basics", true);
  await q.setSkillKnown(testEmail, "Query Check", "SQL Fundamentals", true);
  console.log("after adding two:", await q.getKnownSkillNames(testEmail));
  await q.setSkillKnown(testEmail, "Query Check", "SQL Fundamentals", false);
  console.log("after removing one:", await q.getKnownSkillNames(testEmail));
  await q.setTargetRole(testEmail, "Query Check", "Data Analyst");
  console.log("target role:", await q.getTargetRole(testEmail));
  await q.setTargetRole(testEmail, "Query Check", "Backend Engineer");
  console.log("target role after switch (must be single):", await q.getTargetRole(testEmail));
  await q.setTargetRole(testEmail, "Query Check", null);
  console.log("target role after clear:", await q.getTargetRole(testEmail));

  heading("All queries completed");
}

main()
  .catch((err) => {
    console.error("\n✗ check failed:", err);
    process.exitCode = 1;
  })
  .finally(() => closeDriver());
