import { read, write } from "./neo4j";
import type {
  ChainSkill,
  Course,
  LearningPathStep,
  RecommendedCourse,
  Skill,
  SkillDetail,
} from "./types";

/** Every course/skill traversal is capped at this many hops so a malformed graph can't run away. */
const MAX_HOPS = 10;

export async function getCategories(): Promise<string[]> {
  const rows = await read<{ name: string }>(
    `MATCH (c:Category) RETURN c.name AS name ORDER BY name`
  );
  return rows.map((r) => r.name);
}

export async function getSkills(category?: string): Promise<Skill[]> {
  const rows = await read<Skill & { courseCount: number }>(
    `MATCH (s:Skill)-[:PART_OF]->(cat:Category)
     WHERE $category IS NULL OR cat.name = $category
     OPTIONAL MATCH (s)<-[:TEACHES]-(:Course)
     RETURN s.name AS name, s.level AS level, s.description AS description, cat.name AS category,
            count(*) AS courseCount
     ORDER BY s.name ASC`,
    { category: category ?? null }
  );
  return rows;
}

export async function getAllCourses(): Promise<Course[]> {
  return read<Course>(
    `MATCH (c:Course)
     RETURN c.title AS title, c.provider AS provider, c.hours AS hours, c.level AS level, c.description AS description
     ORDER BY c.title ASC`
  );
}

/**
 * A single skill with its direct (1-hop) neighborhood: the prerequisites it needs,
 * the skills it unlocks, and the courses that teach it or require it.
 */
export async function getSkillDetail(name: string): Promise<SkillDetail | null> {
  const rows = await read<{
    skill: Skill;
    prereqs: Skill[];
    dependents: Skill[];
    teachingCourses: Course[];
    requiringCourses: Course[];
  }>(
    `MATCH (target:Skill {name: $name})
     OPTIONAL MATCH (pre:Skill)-[:PREREQUISITE_OF]->(target)
     WITH target, collect(DISTINCT {name: pre.name, level: pre.level, description: pre.description}) AS prereqs
     OPTIONAL MATCH (target)-[:PREREQUISITE_OF]->(dep:Skill)
     WITH target, prereqs, collect(DISTINCT {name: dep.name, level: dep.level, description: dep.description}) AS dependents
     OPTIONAL MATCH (tc:Course)-[:TEACHES]->(target)
     WITH target, prereqs, dependents,
          collect(DISTINCT {title: tc.title, provider: tc.provider, hours: tc.hours, level: tc.level, description: tc.description}) AS teachingCourses
     OPTIONAL MATCH (rc:Course)-[:REQUIRES]->(target)
     WITH target, prereqs, dependents, teachingCourses,
          collect(DISTINCT {title: rc.title, provider: rc.provider, hours: rc.hours, level: rc.level, description: rc.description}) AS requiringCourses
     RETURN {name: target.name, level: target.level, description: target.description} AS skill,
            prereqs, dependents, teachingCourses, requiringCourses`,
    { name }
  );

  if (rows.length === 0) return null;
  const row = rows[0];
  return {
    skill: row.skill,
    directPrerequisites: row.prereqs.filter((s) => s.name),
    directDependents: row.dependents.filter((s) => s.name),
    teachingCourses: row.teachingCourses.filter((c) => c.title),
    requiringCourses: row.requiringCourses.filter((c) => c.title),
  };
}

/**
 * Multi-hop traversal: every ancestor skill that must be learned before `name`,
 * however many prerequisite hops away, with the shortest hop-distance to it.
 */
export async function getPrerequisiteChain(name: string): Promise<ChainSkill[]> {
  return read<ChainSkill>(
    `MATCH (target:Skill {name: $name})
     MATCH path = (ancestor:Skill)-[:PREREQUISITE_OF*1..${MAX_HOPS}]->(target)
     WITH ancestor, min(length(path)) AS depth
     RETURN ancestor.name AS name, ancestor.level AS level, ancestor.description AS description, depth
     ORDER BY depth ASC, name ASC`,
    { name }
  );
}

/**
 * The personalized learning path to a target skill: every prerequisite skill the
 * learner doesn't already know, ordered from most foundational to the target itself,
 * each paired with the shortest (fewest-hours) course that teaches it.
 *
 * This single traversal — variable-length graph reachability, a NOT IN set-difference
 * against known skills, and a per-skill "cheapest course" join — is exactly the kind of
 * query that turns into a gnarly recursive CTE plus correlated subqueries in SQL.
 */
export async function getLearningPath(
  target: string,
  known: string[]
): Promise<LearningPathStep[]> {
  const rows = await read<{
    skill: Skill;
    hopsToTarget: number;
    recommendedCourse: Course | null;
  }>(
    `MATCH (target:Skill {name: $target})
     MATCH path = (skillNode:Skill)-[:PREREQUISITE_OF*0..${MAX_HOPS}]->(target)
     WITH skillNode, min(length(path)) AS hopsToTarget
     WHERE NOT skillNode.name IN $known
     OPTIONAL MATCH (course:Course)-[:TEACHES]->(skillNode)
     WITH skillNode, hopsToTarget, course
     ORDER BY course.hours ASC
     WITH skillNode, hopsToTarget, collect(course)[0] AS bestCourse
     RETURN {name: skillNode.name, level: skillNode.level, description: skillNode.description} AS skill,
            hopsToTarget,
            CASE WHEN bestCourse IS NULL THEN NULL
                 ELSE {title: bestCourse.title, provider: bestCourse.provider, hours: bestCourse.hours,
                       level: bestCourse.level, description: bestCourse.description}
            END AS recommendedCourse
     ORDER BY hopsToTarget DESC, skill.name ASC`,
    { target, known }
  );

  return rows.map((r) => ({
    skill: r.skill,
    hopsToTarget: r.hopsToTarget,
    recommendedCourse: r.recommendedCourse,
  }));
}

/**
 * Courses the learner is ready for right now (every REQUIRES skill already known)
 * that still teach at least one skill they don't know yet.
 */
export async function getRecommendedCourses(known: string[]): Promise<RecommendedCourse[]> {
  return read<RecommendedCourse>(
    `MATCH (course:Course)
     OPTIONAL MATCH (course)-[:REQUIRES]->(req:Skill)
     WITH course, collect(req.name) AS requiredSkills
     WHERE ALL(r IN requiredSkills WHERE r IN $known)
     MATCH (course)-[:TEACHES]->(taught:Skill)
     WITH course, requiredSkills, collect(DISTINCT taught.name) AS teachesSkills
     WHERE ANY(t IN teachesSkills WHERE NOT t IN $known)
     RETURN course.title AS title, course.provider AS provider, course.hours AS hours,
            course.level AS level, course.description AS description,
            requiredSkills, teachesSkills
     ORDER BY course.hours ASC`,
    { known }
  );
}

export async function getOrCreateLearner(email: string, name: string): Promise<void> {
  await write(
    `MERGE (l:Learner {email: $email})
     ON CREATE SET l.name = $name
     ON MATCH SET l.name = coalesce(l.name, $name)`,
    { email, name }
  );
}

export async function getKnownSkillNames(email: string): Promise<string[]> {
  const rows = await read<{ name: string }>(
    `MATCH (l:Learner {email: $email})-[:KNOWS]->(s:Skill)
     RETURN s.name AS name ORDER BY name`,
    { email }
  );
  return rows.map((r) => r.name);
}

export async function setSkillKnown(
  email: string,
  skillName: string,
  known: boolean
): Promise<void> {
  if (known) {
    await write(
      `MERGE (l:Learner {email: $email})
       WITH l
       MATCH (s:Skill {name: $skillName})
       MERGE (l)-[:KNOWS]->(s)`,
      { email, skillName }
    );
  } else {
    await write(
      `MATCH (l:Learner {email: $email})-[k:KNOWS]->(s:Skill {name: $skillName})
       DELETE k`,
      { email, skillName }
    );
  }
}
