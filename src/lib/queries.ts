/**
 * Every Cypher query in the application lives here.
 *
 * All of them are parameterized (`$name` placeholders bound through the official
 * driver) — no user input is ever concatenated into a query string.
 *
 * A note on relationship properties: the graph stores `strength` on
 * PREREQUISITE_OF, `coverage` on TEACHES and `importance` on NEEDS. Filtering a
 * *variable-length* pattern on a relationship property is not supported by
 * CognoDB's inline-map syntax, so multi-hop queries below use the portable form
 * `ALL(r IN relationships(path) WHERE r.strength = 'hard')` instead.
 */
import { read, write } from "./neo4j";
import type {
  ChainSkill,
  Course,
  PathStep,
  RecommendedCourse,
  Role,
  RoleNeed,
  RoleReadiness,
  Skill,
  SkillDetail,
  SkillSummary,
} from "./types";

/** Traversals are bounded so a cycle in the data can never produce an unbounded walk. */
const MAX_HOPS = 8;

/* ────────────────────────────── catalog ────────────────────────────── */

export async function getCategories(): Promise<string[]> {
  const rows = await read<{ name: string }>(
    "MATCH (c:Category) RETURN c.name AS name ORDER BY name"
  );
  return rows.map((r) => r.name);
}

export async function getSkills(category?: string): Promise<SkillSummary[]> {
  return read<SkillSummary>(
    `MATCH (s:Skill)-[:PART_OF]->(cat:Category)
     WHERE $category IS NULL OR cat.name = $category
     OPTIONAL MATCH (course:Course)-[t:TEACHES]->(s) WHERE t.coverage = 'primary'
     WITH s, cat, count(DISTINCT course) AS courseCount
     OPTIONAL MATCH (role:Role)-[:NEEDS]->(s)
     RETURN s.name AS name, s.level AS level, s.description AS description,
            cat.name AS category, courseCount, count(DISTINCT role) AS roleCount
     ORDER BY name ASC`,
    { category: category ?? null }
  );
}

export async function getAllCourses(): Promise<Course[]> {
  return read<Course>(
    `MATCH (c:Course)-[:OFFERED_BY]->(p:Provider)
     RETURN c.title AS title, p.name AS provider, c.hours AS hours,
            c.level AS level, c.description AS description
     ORDER BY title ASC`
  );
}

/**
 * A single skill with its one-hop neighbourhood in every direction: the skills it
 * needs, the skills it unlocks, the courses that teach or require it, and the
 * roles that ask for it — five relationship types read in one round trip.
 */
export async function getSkillDetail(name: string): Promise<SkillDetail | null> {
  const rows = await read<SkillDetail>(
    `MATCH (target:Skill {name: $name})-[:PART_OF]->(cat:Category)

     OPTIONAL MATCH (pre:Skill)-[preRel:PREREQUISITE_OF]->(target)
     WITH target, cat, collect(DISTINCT {
       name: pre.name, level: pre.level, description: pre.description, strength: preRel.strength
     }) AS directPrerequisites

     OPTIONAL MATCH (target)-[depRel:PREREQUISITE_OF]->(dep:Skill)
     WITH target, cat, directPrerequisites, collect(DISTINCT {
       name: dep.name, level: dep.level, description: dep.description, strength: depRel.strength
     }) AS directDependents

     OPTIONAL MATCH (tc:Course)-[teach:TEACHES]->(target)
     OPTIONAL MATCH (tc)-[:OFFERED_BY]->(tp:Provider)
     WITH target, cat, directPrerequisites, directDependents, collect(DISTINCT {
       title: tc.title, provider: tp.name, hours: tc.hours, level: tc.level,
       description: tc.description, coverage: teach.coverage
     }) AS teachingCourses

     OPTIONAL MATCH (rc:Course)-[:REQUIRES]->(target)
     OPTIONAL MATCH (rc)-[:OFFERED_BY]->(rp:Provider)
     WITH target, cat, directPrerequisites, directDependents, teachingCourses, collect(DISTINCT {
       title: rc.title, provider: rp.name, hours: rc.hours, level: rc.level, description: rc.description
     }) AS requiringCourses

     OPTIONAL MATCH (role:Role)-[need:NEEDS]->(target)
     RETURN {name: target.name, level: target.level, description: target.description,
             category: cat.name} AS skill,
            directPrerequisites, directDependents, teachingCourses, requiringCourses,
            collect(DISTINCT {
              title: role.title, description: role.description, importance: need.importance
            }) AS neededByRoles`,
    { name }
  );

  if (rows.length === 0) return null;
  const row = rows[0];

  // OPTIONAL MATCH yields one all-null map when nothing matched; drop those.
  return {
    skill: row.skill,
    directPrerequisites: row.directPrerequisites.filter((s) => s.name),
    directDependents: row.directDependents.filter((s) => s.name),
    teachingCourses: row.teachingCourses.filter((c) => c.title),
    requiringCourses: row.requiringCourses.filter((c) => c.title),
    neededByRoles: row.neededByRoles.filter((r) => r.title),
  };
}

/**
 * MULTI-HOP TRAVERSAL — every ancestor skill that must be learned before `name`,
 * at any depth, with the shortest hop-distance to it.
 *
 * `blocking` reports whether a chain of purely *hard* prerequisites exists, which
 * is what separates "you cannot start without this" from "this would help".
 */
export async function getPrerequisiteChain(name: string): Promise<ChainSkill[]> {
  return read<ChainSkill>(
    `MATCH (target:Skill {name: $name})
     MATCH path = (ancestor:Skill)-[:PREREQUISITE_OF*1..${MAX_HOPS}]->(target)
     // Both aggregates must describe the SAME path, or a row can pair the length of
     // a recommended route with a blocking flag earned by a different, longer one.
     // min() skips nulls, so hardDepth is the shortest all-hard route, or null if
     // none exists — which is exactly the blocking test.
     WITH ancestor,
          min(length(path)) AS anyDepth,
          min(CASE WHEN ALL(r IN relationships(path) WHERE r.strength = 'hard')
                   THEN length(path) END) AS hardDepth
     RETURN ancestor.name AS name, ancestor.level AS level,
            ancestor.description AS description,
            coalesce(hardDepth, anyDepth) AS depth,
            hardDepth IS NOT NULL AS blocking
     ORDER BY depth ASC, name ASC`,
    { name }
  );
}

/* ─────────────────────────────── roles ─────────────────────────────── */

export async function getRoles(): Promise<Array<Role & { coreSkills: number }>> {
  return read<Role & { coreSkills: number }>(
    `MATCH (r:Role)
     OPTIONAL MATCH (r)-[n:NEEDS]->(:Skill) WHERE n.importance = 'core'
     RETURN r.title AS title, r.description AS description, count(n) AS coreSkills
     ORDER BY title ASC`
  );
}

export async function getRoleNeeds(title: string): Promise<RoleNeed[] | null> {
  const rows = await read<RoleNeed>(
    `MATCH (r:Role {title: $title})-[need:NEEDS]->(s:Skill)
     RETURN s.name AS name, s.level AS level, s.description AS description,
            need.importance AS importance
     ORDER BY need.importance ASC, s.name ASC`,
    { title }
  );
  if (rows.length === 0) {
    const exists = await read<{ found: number }>(
      "MATCH (r:Role {title: $title}) RETURN count(r) AS found",
      { title }
    );
    if (!exists[0]?.found) return null;
  }
  return rows;
}

/**
 * How ready a learner is for every role, scored over the NEEDS edges.
 * One query answers "which job am I closest to?" across the whole catalog.
 */
export async function getRoleReadiness(known: string[]): Promise<RoleReadiness[]> {
  const rows = await read<RoleReadiness>(
    `MATCH (r:Role)-[need:NEEDS]->(s:Skill)
     WITH r,
          collect(CASE WHEN need.importance = 'core' THEN s.name END) AS coreNames,
          collect(CASE WHEN need.importance = 'nice-to-have' THEN s.name END) AS niceNames
     WITH r,
          [n IN coreNames WHERE n IS NOT NULL] AS core,
          [n IN niceNames WHERE n IS NOT NULL] AS nice
     WITH r, core, nice,
          [n IN core WHERE n IN $known] AS coreHeld,
          [n IN nice WHERE n IN $known] AS niceHeld
     RETURN {title: r.title, description: r.description} AS role,
            size(core) AS coreSkills,
            size(coreHeld) AS coreKnown,
            size(nice) AS niceToHaveSkills,
            size(niceHeld) AS niceToHaveKnown,
            // Must round the same way RolePathPanel does client-side, or the same
            // role shows two different percentages on /profile and /roles/[title].
            CASE WHEN size(core) = 0 THEN 0
                 ELSE toInteger(round(100.0 * size(coreHeld) / size(core))) END AS readiness,
            [n IN core WHERE NOT n IN $known] AS missingCore
     ORDER BY readiness DESC, r.title ASC`,
    { known }
  );
  return rows;
}

/* ──────────────────────────── path finding ─────────────────────────── */

/**
 * THE QUERY A RELATIONAL DATABASE WOULD FIND AWKWARD.
 *
 * Given a target role, this returns the complete ordered set of skills the learner
 * still needs, by combining four things in one traversal:
 *
 *   1. fan out from the Role across its NEEDS edges to the goal skills,
 *   2. expand each goal into its full hard-prerequisite closure at any depth,
 *   3. subtract everything the learner already KNOWS,
 *   4. rank what remains by how many of *its own* prerequisites are still unmet,
 *      and attach the shortest course that primarily teaches it.
 *
 * In SQL this is a recursive CTE seeded from a join, a second correlated recursive
 * count per surviving row, and a window function for the cheapest course — rebuilt
 * on every request because `$known` changes each time a learner checks a box.
 */
export async function getPathToRole(
  role: string,
  known: string[],
  includeNiceToHave = false
): Promise<PathStep[] | null> {
  const rows = await read<PathStep>(
    `MATCH (role:Role {title: $role})-[need:NEEDS]->(goal:Skill)
     WHERE $includeNiceToHave OR need.importance = 'core'

     // 2 — full hard-prerequisite closure of each goal skill (0 hops = the goal itself)
     MATCH path = (step:Skill)-[:PREREQUISITE_OF*0..${MAX_HOPS}]->(goal)
     WHERE ALL(r IN relationships(path) WHERE r.strength = 'hard')
       AND NOT step.name IN $known                                   // 3 — subtract known
     WITH step,
          collect(DISTINCT goal.name) AS goals,
          // Tracked separately so the "role requirement" badge stays truthful when
          // nice-to-have skills are folded into the traversal.
          collect(DISTINCT CASE WHEN need.importance = 'core' THEN goal.name END) AS coreGoals
     // A step can be a goal skill itself (the 0-hop case); don't let it "unlock" itself.
     WITH step,
          [g IN goals WHERE g <> step.name] AS unlocks,
          step.name IN [g IN coreGoals WHERE g IS NOT NULL] AS isGoal

     // 4a — how many of this step's own hard prerequisites are still missing?
     OPTIONAL MATCH ancestry = (anc:Skill)-[:PREREQUISITE_OF*1..${MAX_HOPS}]->(step)
     WHERE ALL(r IN relationships(ancestry) WHERE r.strength = 'hard')
       AND NOT anc.name IN $known
     WITH step, unlocks, isGoal, count(DISTINCT anc) AS unmetPrerequisites

     // 4b — shortest course that primarily teaches this step
     OPTIONAL MATCH (course:Course)-[t:TEACHES]->(step) WHERE t.coverage = 'primary'
     OPTIONAL MATCH (course)-[:OFFERED_BY]->(prov:Provider)
     WITH step, unlocks, isGoal, unmetPrerequisites, course, prov
     ORDER BY course.hours ASC
     WITH step, unlocks, isGoal, unmetPrerequisites,
          collect(CASE WHEN course IS NULL THEN null ELSE {
            title: course.title, provider: prov.name, hours: course.hours,
            level: course.level, description: course.description
          } END) AS courseOptions
     WITH step, unlocks, isGoal, unmetPrerequisites,
          [c IN courseOptions WHERE c IS NOT NULL] AS courses

     RETURN {name: step.name, level: step.level, description: step.description} AS skill,
            unmetPrerequisites,
            unlocks,
            isGoal,
            CASE WHEN size(courses) = 0 THEN null ELSE courses[0] END AS recommendedCourse
     ORDER BY unmetPrerequisites ASC, skill.name ASC`,
    { role, known, includeNiceToHave }
  );

  // An empty result is ambiguous: the learner may be ready, or the role may not
  // exist. Distinguish them so a typo'd target isn't reported as "you're done".
  return rows.length > 0 || (await roleExists(role)) ? rows : null;
}

async function roleExists(title: string): Promise<boolean> {
  const rows = await read<{ found: number }>(
    "MATCH (r:Role {title: $title}) RETURN count(r) AS found",
    { title }
  );
  return Boolean(rows[0]?.found);
}

async function skillExists(name: string): Promise<boolean> {
  const rows = await read<{ found: number }>(
    "MATCH (s:Skill {name: $name}) RETURN count(s) AS found",
    { name }
  );
  return Boolean(rows[0]?.found);
}

/**
 * The same idea aimed at a single skill rather than a whole role: the ordered set
 * of prerequisites the learner is missing, each with the shortest course for it.
 */
export async function getPathToSkill(
  target: string,
  known: string[]
): Promise<PathStep[] | null> {
  const rows = await read<PathStep>(
    `MATCH (goal:Skill {name: $target})
     MATCH path = (step:Skill)-[:PREREQUISITE_OF*0..${MAX_HOPS}]->(goal)
     WHERE ALL(r IN relationships(path) WHERE r.strength = 'hard')
       AND NOT step.name IN $known
     WITH DISTINCT step

     OPTIONAL MATCH ancestry = (anc:Skill)-[:PREREQUISITE_OF*1..${MAX_HOPS}]->(step)
     WHERE ALL(r IN relationships(ancestry) WHERE r.strength = 'hard')
       AND NOT anc.name IN $known
     WITH step, count(DISTINCT anc) AS unmetPrerequisites

     OPTIONAL MATCH (course:Course)-[t:TEACHES]->(step) WHERE t.coverage = 'primary'
     OPTIONAL MATCH (course)-[:OFFERED_BY]->(prov:Provider)
     WITH step, unmetPrerequisites, course, prov
     ORDER BY course.hours ASC
     WITH step, unmetPrerequisites,
          collect(CASE WHEN course IS NULL THEN null ELSE {
            title: course.title, provider: prov.name, hours: course.hours,
            level: course.level, description: course.description
          } END) AS courseOptions
     WITH step, unmetPrerequisites,
          [c IN courseOptions WHERE c IS NOT NULL] AS courses

     RETURN {name: step.name, level: step.level, description: step.description} AS skill,
            unmetPrerequisites,
            CASE WHEN size(courses) = 0 THEN null ELSE courses[0] END AS recommendedCourse
     ORDER BY unmetPrerequisites ASC, skill.name ASC`,
    { target, known }
  );

  return rows.length > 0 || (await skillExists(target)) ? rows : null;
}

/**
 * Courses the learner can start today: every REQUIRES skill already held, and at
 * least one primarily-taught skill still missing. Two set-membership tests over a
 * join, expressed as ALL(...) and ANY(...) list predicates.
 */
export async function getRecommendedCourses(known: string[]): Promise<RecommendedCourse[]> {
  return read<RecommendedCourse>(
    `MATCH (course:Course)-[:OFFERED_BY]->(prov:Provider)
     OPTIONAL MATCH (course)-[:REQUIRES]->(req:Skill)
     WITH course, prov, collect(DISTINCT req.name) AS requiredSkills
     WHERE ALL(r IN requiredSkills WHERE r IN $known)
     MATCH (course)-[t:TEACHES]->(taught:Skill) WHERE t.coverage = 'primary'
     WITH course, prov, requiredSkills, collect(DISTINCT taught.name) AS teachesSkills
     WITH course, prov, requiredSkills, teachesSkills,
          [s IN teachesSkills WHERE NOT s IN $known] AS newSkills
     WHERE size(newSkills) > 0
     RETURN course.title AS title, prov.name AS provider, course.hours AS hours,
            course.level AS level, course.description AS description,
            requiredSkills, teachesSkills, newSkills
     ORDER BY course.hours ASC`,
    { known }
  );
}

/* ────────────────────────────── learner ────────────────────────────── */

export async function getKnownSkillNames(email: string): Promise<string[]> {
  const rows = await read<{ name: string }>(
    `MATCH (l:Learner {email: $email})-[:KNOWS]->(s:Skill)
     RETURN s.name AS name ORDER BY name`,
    { email }
  );
  return rows.map((r) => r.name);
}

/**
 * Adds or removes a KNOWS edge. Returns false when the skill doesn't exist, so the
 * caller can answer 404 instead of a 200 that quietly changed nothing.
 */
export async function setSkillKnown(
  email: string,
  learnerName: string,
  skillName: string,
  known: boolean
): Promise<boolean> {
  if (known) {
    // The Skill is matched BEFORE the Learner is merged: an unknown skill name
    // then ends the row stream without leaving an orphan Learner behind.
    const rows = await write<{ name: string }>(
      `MATCH (s:Skill {name: $skillName})
       MERGE (l:Learner {email: $email})
         ON CREATE SET l.name = $learnerName
       MERGE (l)-[:KNOWS]->(s)
       RETURN s.name AS name`,
      { email, learnerName, skillName }
    );
    return rows.length > 0;
  }

  await write(
    `MATCH (:Learner {email: $email})-[k:KNOWS]->(:Skill {name: $skillName})
     DELETE k`,
    { email, skillName }
  );
  return true;
}

/**
 * Points the learner at a role, replacing any previous target. Returns false when
 * the role doesn't exist.
 */
export async function setTargetRole(
  email: string,
  learnerName: string,
  roleTitle: string | null
): Promise<boolean> {
  if (roleTitle) {
    // The Role is matched FIRST. Deleting the old edge before confirming the new
    // role exists would destroy a valid target on a typo'd request and still
    // report success.
    const rows = await write<{ title: string }>(
      `MATCH (r:Role {title: $roleTitle})
       MERGE (l:Learner {email: $email})
         ON CREATE SET l.name = $learnerName
       WITH l, r
       OPTIONAL MATCH (l)-[old:TARGETS]->(:Role)
       DELETE old
       WITH l, r
       MERGE (l)-[:TARGETS]->(r)
       RETURN r.title AS title`,
      { email, learnerName, roleTitle }
    );
    return rows.length > 0;
  }

  await write("MATCH (:Learner {email: $email})-[t:TARGETS]->(:Role) DELETE t", { email });
  return true;
}

export async function getTargetRole(email: string): Promise<string | null> {
  const rows = await read<{ title: string }>(
    "MATCH (:Learner {email: $email})-[:TARGETS]->(r:Role) RETURN r.title AS title",
    { email }
  );
  return rows[0]?.title ?? null;
}

/* ───────────────────────────── graph stats ─────────────────────────── */

export async function getGraphStats(): Promise<{
  skills: number;
  courses: number;
  roles: number;
  providers: number;
  categories: number;
  relationships: number;
  totalHours: number;
}> {
  const rows = await read<{
    skills: number;
    courses: number;
    roles: number;
    providers: number;
    categories: number;
    relationships: number;
    totalHours: number;
  }>(
    // Every stage is an OPTIONAL MATCH on purpose: a plain MATCH that finds nothing
    // ends the row stream, so a single empty label would collapse the whole result
    // and the dashboard would report zero for every count, not just that one.
    `OPTIONAL MATCH (s:Skill) WITH count(s) AS skills
     OPTIONAL MATCH (c:Course) WITH skills, count(c) AS courses, coalesce(sum(c.hours), 0) AS totalHours
     OPTIONAL MATCH (r:Role) WITH skills, courses, totalHours, count(r) AS roles
     OPTIONAL MATCH (p:Provider) WITH skills, courses, totalHours, roles, count(p) AS providers
     OPTIONAL MATCH (cat:Category) WITH skills, courses, totalHours, roles, providers, count(cat) AS categories
     OPTIONAL MATCH ()-[rel]->()
     RETURN skills, courses, roles, providers, categories, totalHours,
            count(rel) AS relationships`
  );
  return (
    rows[0] ?? {
      skills: 0,
      courses: 0,
      roles: 0,
      providers: 0,
      categories: 0,
      relationships: 0,
      totalHours: 0,
    }
  );
}

export type { Skill };
