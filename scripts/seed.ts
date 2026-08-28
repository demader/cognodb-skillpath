/**
 * Loads the SkillPath graph into CognoDB.
 *
 * Every write is a parameterized `UNWIND $rows AS row …` statement — the driver
 * ships the data as Bolt parameters, so no value is ever concatenated into Cypher.
 *
 * Usage: npm run seed
 */
import neo4j, { type Session } from "neo4j-driver";
import { requireConnectionEnv } from "./load-env";
import { categories, courses, providers, roles, skills } from "./seed-data";

const CONSTRAINTS = [
  "CREATE CONSTRAINT skill_name IF NOT EXISTS FOR (s:Skill) REQUIRE s.name IS UNIQUE",
  "CREATE CONSTRAINT course_title IF NOT EXISTS FOR (c:Course) REQUIRE c.title IS UNIQUE",
  "CREATE CONSTRAINT category_name IF NOT EXISTS FOR (c:Category) REQUIRE c.name IS UNIQUE",
  "CREATE CONSTRAINT provider_name IF NOT EXISTS FOR (p:Provider) REQUIRE p.name IS UNIQUE",
  "CREATE CONSTRAINT role_title IF NOT EXISTS FOR (r:Role) REQUIRE r.title IS UNIQUE",
  "CREATE CONSTRAINT learner_email IF NOT EXISTS FOR (l:Learner) REQUIRE l.email IS UNIQUE",
];

/** A demo learner so the KNOWS / TARGETS parts of the model aren't empty on a fresh seed. */
const DEMO_LEARNER = {
  email: "demo@skillpath.local",
  name: "Demo Learner",
  knows: [
    "Programming Basics",
    "Variables & Control Flow",
    "Functions & Scope",
    "HTML & CSS",
    "JavaScript Basics",
    "Command Line & Linux Basics",
    "Version Control with Git",
  ],
  targets: "Full-Stack Engineer",
};

async function main() {
  const { uri, username, password } = requireConnectionEnv();
  const driver = neo4j.driver(uri, neo4j.auth.basic(username, password), {
    disableLosslessIntegers: true,
  });

  try {
    await driver.verifyConnectivity();
    console.log(`✓ Connected to CognoDB at ${uri}\n`);
  } catch (err) {
    console.error("✗ Could not reach CognoDB. Check NEO4J_URI / credentials.\n", err);
    await driver.close();
    process.exit(1);
  }

  const session = driver.session();
  try {
    await run(session, "Clearing existing graph", "MATCH (n) DETACH DELETE n");

    // Constraints are best-effort: they enforce uniqueness where supported, but a
    // managed instance may restrict DDL, and the seed is still correct without them.
    for (const cypher of CONSTRAINTS) {
      try {
        await session.executeWrite((tx) => tx.run(cypher));
      } catch (err) {
        console.warn(`  ! constraint skipped: ${(err as Error).message.split("\n")[0]}`);
      }
    }
    console.log(`✓ Constraints ensured (${CONSTRAINTS.length})`);

    await run(
      session,
      `Creating ${categories.length} categories`,
      "UNWIND $rows AS row CREATE (:Category {name: row})",
      { rows: categories }
    );

    await run(
      session,
      `Creating ${providers.length} providers`,
      "UNWIND $rows AS row CREATE (:Provider {name: row})",
      { rows: providers }
    );

    await run(
      session,
      `Creating ${skills.length} skills`,
      `UNWIND $rows AS row
       MATCH (cat:Category {name: row.category})
       CREATE (s:Skill {name: row.name, level: row.level, description: row.description})
       CREATE (s)-[:PART_OF]->(cat)`,
      {
        rows: skills.map((s) => ({
          name: s.name,
          level: s.level,
          description: s.description,
          category: s.category,
        })),
      }
    );

    // PREREQUISITE_OF carries a `strength` so traversals can distinguish blocking
    // prerequisites from merely helpful ones.
    const prerequisiteEdges = [
      ...skills.flatMap((s) =>
        (s.prerequisites ?? []).map((from) => ({ from, to: s.name, strength: "hard" }))
      ),
      ...skills.flatMap((s) =>
        (s.recommended ?? []).map((from) => ({ from, to: s.name, strength: "recommended" }))
      ),
    ];
    await run(
      session,
      `Linking ${prerequisiteEdges.length} skill prerequisites`,
      `UNWIND $rows AS row
       MATCH (pre:Skill {name: row.from}), (post:Skill {name: row.to})
       CREATE (pre)-[:PREREQUISITE_OF {strength: row.strength}]->(post)`,
      { rows: prerequisiteEdges }
    );

    await run(
      session,
      `Creating ${courses.length} courses`,
      `UNWIND $rows AS row
       MATCH (p:Provider {name: row.provider})
       CREATE (c:Course {title: row.title, hours: row.hours, level: row.level, description: row.description})
       CREATE (c)-[:OFFERED_BY]->(p)`,
      {
        rows: courses.map((c) => ({
          title: c.title,
          hours: c.hours,
          level: c.level,
          description: c.description,
          provider: c.provider,
        })),
      }
    );

    // TEACHES carries `coverage`: a course either fully teaches a skill or just touches it.
    const teachesEdges = [
      ...courses.flatMap((c) =>
        c.teaches.map((skill) => ({ course: c.title, skill, coverage: "primary" }))
      ),
      ...courses.flatMap((c) =>
        (c.alsoCovers ?? []).map((skill) => ({ course: c.title, skill, coverage: "partial" }))
      ),
    ];
    await run(
      session,
      `Linking ${teachesEdges.length} TEACHES relationships`,
      `UNWIND $rows AS row
       MATCH (c:Course {title: row.course}), (s:Skill {name: row.skill})
       CREATE (c)-[:TEACHES {coverage: row.coverage}]->(s)`,
      { rows: teachesEdges }
    );

    const requiresEdges = courses.flatMap((c) =>
      (c.requires ?? []).map((skill) => ({ course: c.title, skill }))
    );
    await run(
      session,
      `Linking ${requiresEdges.length} course prerequisites`,
      `UNWIND $rows AS row
       MATCH (c:Course {title: row.course}), (s:Skill {name: row.skill})
       CREATE (c)-[:REQUIRES]->(s)`,
      { rows: requiresEdges }
    );

    await run(
      session,
      `Creating ${roles.length} roles`,
      "UNWIND $rows AS row CREATE (:Role {title: row.title, description: row.description})",
      { rows: roles.map((r) => ({ title: r.title, description: r.description })) }
    );

    // NEEDS carries `importance` so a role's must-haves can be separated from its bonuses.
    const needsEdges = [
      ...roles.flatMap((r) =>
        r.core.map((skill) => ({ role: r.title, skill, importance: "core" }))
      ),
      ...roles.flatMap((r) =>
        (r.niceToHave ?? []).map((skill) => ({ role: r.title, skill, importance: "nice-to-have" }))
      ),
    ];
    await run(
      session,
      `Linking ${needsEdges.length} role skill requirements`,
      `UNWIND $rows AS row
       MATCH (r:Role {title: row.role}), (s:Skill {name: row.skill})
       CREATE (r)-[:NEEDS {importance: row.importance}]->(s)`,
      { rows: needsEdges }
    );

    await run(
      session,
      "Creating the demo learner",
      `MERGE (l:Learner {email: $email})
         ON CREATE SET l.name = $name
       WITH l
       UNWIND $knows AS skillName
       MATCH (s:Skill {name: skillName})
       MERGE (l)-[:KNOWS]->(s)
       WITH DISTINCT l
       MATCH (r:Role {title: $targets})
       MERGE (l)-[:TARGETS]->(r)`,
      DEMO_LEARNER
    );

    await report(session);
  } catch (err) {
    console.error("\n✗ Seed failed:", err);
    process.exitCode = 1;
  } finally {
    await session.close();
    await driver.close();
  }
}

async function run(
  session: Session,
  label: string,
  cypher: string,
  params: Record<string, unknown> = {}
) {
  await session.executeWrite((tx) => tx.run(cypher, params));
  console.log(`✓ ${label}`);
}

async function report(session: Session) {
  const nodes = await session.executeRead((tx) =>
    tx.run("MATCH (n) RETURN labels(n)[0] AS label, count(*) AS count ORDER BY label")
  );
  const rels = await session.executeRead((tx) =>
    tx.run("MATCH ()-[r]->() RETURN type(r) AS type, count(*) AS count ORDER BY type")
  );

  console.log("\n── Graph summary ──");
  console.log("Nodes:");
  for (const record of nodes.records) {
    console.log(`  ${String(record.get("label")).padEnd(10)} ${record.get("count")}`);
  }
  console.log("Relationships:");
  for (const record of rels.records) {
    console.log(`  ${String(record.get("type")).padEnd(16)} ${record.get("count")}`);
  }
}

main();
