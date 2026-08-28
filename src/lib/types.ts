export type Level = "beginner" | "intermediate" | "advanced";
/** PREREQUISITE_OF.strength — 'hard' blocks progress, 'recommended' merely helps. */
export type Strength = "hard" | "recommended";
/** TEACHES.coverage — 'primary' fully teaches a skill, 'partial' only touches it. */
export type Coverage = "primary" | "partial";
/** NEEDS.importance — 'core' is required for a role, 'nice-to-have' is a bonus. */
export type Importance = "core" | "nice-to-have";

export interface Skill {
  name: string;
  level: Level;
  description: string;
  category?: string;
}

export interface SkillSummary extends Skill {
  /** Courses whose TEACHES edge has coverage 'primary'. */
  courseCount: number;
  /** Roles with a NEEDS edge to this skill. */
  roleCount: number;
}

export interface Course {
  title: string;
  provider: string;
  hours: number;
  level: Level;
  description: string;
}

/** A course paired with how thoroughly it covers the skill in question. */
export interface TeachingCourse extends Course {
  coverage: Coverage;
}

/** A neighbouring skill plus the strength of the edge that connects it. */
export interface RelatedSkill extends Skill {
  strength: Strength;
}

export interface Role {
  title: string;
  description: string;
}

export interface RoleNeed extends Skill {
  importance: Importance;
}

export interface SkillDetail {
  skill: Skill & { category: string };
  directPrerequisites: RelatedSkill[];
  directDependents: RelatedSkill[];
  teachingCourses: TeachingCourse[];
  requiringCourses: Course[];
  neededByRoles: Array<Role & { importance: Importance }>;
}

/** An ancestor skill in a multi-hop prerequisite chain. */
export interface ChainSkill extends Skill {
  /** Fewest PREREQUISITE_OF hops between this skill and the target. */
  depth: number;
  /** True when every hop on the shortest chain is a hard prerequisite. */
  blocking: boolean;
}

/** One step of a generated learning path. */
export interface PathStep {
  skill: Skill;
  /** How many still-unknown hard prerequisites this step itself depends on. */
  unmetPrerequisites: number;
  recommendedCourse: Course | null;
  /** Which of the goal skills this step unblocks (role paths only). */
  unlocks?: string[];
  /** True when this step is itself one of the role's required skills, not just a prerequisite. */
  isGoal?: boolean;
}

export interface RecommendedCourse extends Course {
  requiredSkills: string[];
  teachesSkills: string[];
  /** Skills this course teaches that the learner doesn't have yet. */
  newSkills: string[];
}

/** How close a learner is to a role, measured over its NEEDS edges. */
export interface RoleReadiness {
  role: Role;
  coreSkills: number;
  coreKnown: number;
  niceToHaveSkills: number;
  niceToHaveKnown: number;
  /** Percentage of core skills already held, 0–100. */
  readiness: number;
  missingCore: string[];
}
