/**
 * Loads the sample skill graph into CognoDB.
 * Usage: npm run seed
 */
import "dotenv/config";
import neo4j from "neo4j-driver";
import { categories, courses, skills } from "./seed-data";

async function main() {
  const uri = process.env.NEO4J_URI;
  const user = process.env.NEO4J_USERNAME;
  const password = process.env.NEO4J_PASSWORD;

  if (!uri || !user || !password) {
    console.error(
      "Missing NEO4J_URI / NEO4J_USERNAME / NEO4J_PASSWORD. Copy .env.example to .env.local and fill in your CognoDB credentials."
    );
    process.exit(1);
  }

  const driver = neo4j.driver(uri, neo4j.auth.basic(user, password));

  try {
    await driver.verifyConnectivity();
    console.log("Connected to CognoDB.");

    const session = driver.session();
    try {
      console.log("Clearing existing graph...");
      await session.executeWrite((tx) => tx.run("MATCH (n) DETACH DELETE n"));

      console.log("Creating constraints...");
      await session.executeWrite((tx) =>
        tx.run("CREATE CONSTRAINT skill_name IF NOT EXISTS FOR (s:Skill) REQUIRE s.name IS UNIQUE")
      );
      await session.executeWrite((tx) =>
        tx.run("CREATE CONSTRAINT course_title IF NOT EXISTS FOR (c:Course) REQUIRE c.title IS UNIQUE")
      );
      await session.executeWrite((tx) =>
        tx.run("CREATE CONSTRAINT category_name IF NOT EXISTS FOR (cat:Category) REQUIRE cat.name IS UNIQUE")
      );
      await session.executeWrite((tx) =>
        tx.run("CREATE CONSTRAINT learner_email IF NOT EXISTS FOR (l:Learner) REQUIRE l.email IS UNIQUE")
      );

      console.log(`Creating ${categories.length} categories...`);
      await session.executeWrite((tx) =>
        tx.run(
          `UNWIND $categories AS name
           CREATE (:Category {name: name})`,
          { categories }
        )
      );

      console.log(`Creating ${skills.length} skills...`);
      await session.executeWrite((tx) =>
        tx.run(
          `UNWIND $skills AS skill
           CREATE (s:Skill {
             name: skill.name,
             level: skill.level,
             description: skill.description
           })
           WITH s, skill
           MATCH (cat:Category {name: skill.category})
           CREATE (s)-[:PART_OF]->(cat)`,
          { skills }
        )
      );

      console.log("Linking skill prerequisites...");
      const prereqEdges = skills.flatMap((s) =>
        (s.prerequisites ?? []).map((p) => ({ from: p, to: s.name }))
      );
      await session.executeWrite((tx) =>
        tx.run(
          `UNWIND $edges AS edge
           MATCH (pre:Skill {name: edge.from}), (post:Skill {name: edge.to})
           CREATE (pre)-[:PREREQUISITE_OF]->(post)`,
          { edges: prereqEdges }
        )
      );

      console.log(`Creating ${courses.length} courses...`);
      await session.executeWrite((tx) =>
        tx.run(
          `UNWIND $courses AS course
           CREATE (c:Course {
             title: course.title,
             provider: course.provider,
             hours: course.hours,
             level: course.level,
             description: course.description
           })`,
          { courses }
        )
      );

      console.log("Linking courses to skills they teach...");
      const teachesEdges = courses.flatMap((c) =>
        c.teaches.map((skillName) => ({ course: c.title, skill: skillName }))
      );
      await session.executeWrite((tx) =>
        tx.run(
          `UNWIND $edges AS edge
           MATCH (c:Course {title: edge.course}), (s:Skill {name: edge.skill})
           CREATE (c)-[:TEACHES]->(s)`,
          { edges: teachesEdges }
        )
      );

      console.log("Linking course prerequisites...");
      const requiresEdges = courses.flatMap((c) =>
        (c.requires ?? []).map((skillName) => ({ course: c.title, skill: skillName }))
      );
      await session.executeWrite((tx) =>
        tx.run(
          `UNWIND $edges AS edge
           MATCH (c:Course {title: edge.course}), (s:Skill {name: edge.skill})
           CREATE (c)-[:REQUIRES]->(s)`,
          { edges: requiresEdges }
        )
      );

      const counts = await session.executeRead((tx) =>
        tx.run(
          `MATCH (n) RETURN labels(n)[0] AS label, count(*) AS count ORDER BY label`
        )
      );
      console.log("\nSeed complete. Node counts:");
      for (const record of counts.records) {
        console.log(`  ${record.get("label")}: ${record.get("count")}`);
      }
    } finally {
      await session.close();
    }
  } catch (err) {
    console.error("Seed failed:", err);
    process.exitCode = 1;
  } finally {
    await driver.close();
  }
}

main();
