export type Level = "beginner" | "intermediate" | "advanced";

export interface Skill {
  name: string;
  level: Level;
  description: string;
  category?: string;
}

export interface Course {
  title: string;
  provider: string;
  hours: number;
  level: Level;
  description: string;
}

export interface SkillDetail {
  skill: Skill;
  directPrerequisites: Skill[];
  directDependents: Skill[];
  teachingCourses: Course[];
  requiringCourses: Course[];
}

export interface ChainSkill extends Skill {
  depth: number;
}

export interface LearningPathStep {
  skill: Skill;
  hopsToTarget: number;
  recommendedCourse: Course | null;
}

export interface RecommendedCourse extends Course {
  requiredSkills: string[];
  teachesSkills: string[];
}
