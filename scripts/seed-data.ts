/**
 * Source data for the SkillPath graph.
 *
 * The shapes here mirror the graph model one-to-one:
 *   Skill / Course / Provider / Category / Role / Learner  → nodes
 *   prerequisites, recommended, teaches, alsoCovers, …     → typed relationships
 *
 * Relationship *properties* carry the nuance that makes the traversals interesting:
 *   PREREQUISITE_OF.strength  'hard' blocks progress; 'recommended' merely helps.
 *   TEACHES.coverage          'primary' fully teaches the skill; 'partial' touches it.
 *   NEEDS.importance          'core' is required for the role; 'nice-to-have' is a bonus.
 */

export type Level = "beginner" | "intermediate" | "advanced";
export type Strength = "hard" | "recommended";
export type Coverage = "primary" | "partial";
export type Importance = "core" | "nice-to-have";

export interface SkillSeed {
  name: string;
  level: Level;
  category: string;
  description: string;
  /** Blocking prerequisites — you cannot meaningfully learn this without them. */
  prerequisites?: string[];
  /** Non-blocking prerequisites — they make this skill easier, but don't gate it. */
  recommended?: string[];
}

export interface CourseSeed {
  title: string;
  provider: string;
  hours: number;
  level: Level;
  description: string;
  /** Skills this course fully teaches. */
  teaches: string[];
  /** Skills this course touches on without fully covering. */
  alsoCovers?: string[];
  /** Skills a learner should already hold before enrolling. */
  requires?: string[];
}

export interface RoleSeed {
  title: string;
  description: string;
  /** Skills the role can't be done without. */
  core: string[];
  /** Skills that strengthen a candidate but aren't required. */
  niceToHave?: string[];
}

export const categories = [
  "Programming Fundamentals",
  "Web Development",
  "Data & Databases",
  "Data Science & ML",
  "DevOps & Cloud",
  "Systems & Networking",
  "Mobile Development",
];

export const skills: SkillSeed[] = [
  // ── Programming Fundamentals ────────────────────────────────────────────────
  { name: "Programming Basics", level: "beginner", category: "Programming Fundamentals", description: "Core notions of writing, running and debugging a program." },
  { name: "Variables & Control Flow", level: "beginner", category: "Programming Fundamentals", description: "Variables, conditionals and loops.", prerequisites: ["Programming Basics"] },
  { name: "Functions & Scope", level: "beginner", category: "Programming Fundamentals", description: "Decomposing programs into reusable functions.", prerequisites: ["Variables & Control Flow"] },
  { name: "Data Structures", level: "intermediate", category: "Programming Fundamentals", description: "Arrays, lists, stacks, queues, trees and hash maps.", prerequisites: ["Functions & Scope"] },
  { name: "Algorithms", level: "intermediate", category: "Programming Fundamentals", description: "Sorting, searching and algorithmic complexity.", prerequisites: ["Data Structures"], recommended: ["Recursion"] },
  { name: "Object-Oriented Programming", level: "intermediate", category: "Programming Fundamentals", description: "Classes, objects, inheritance and polymorphism.", prerequisites: ["Functions & Scope"] },
  { name: "Recursion", level: "intermediate", category: "Programming Fundamentals", description: "Solving problems by self-reference.", prerequisites: ["Functions & Scope"] },
  { name: "Concurrency & Async", level: "advanced", category: "Programming Fundamentals", description: "Threads, async/await, race conditions and deadlocks.", prerequisites: ["Data Structures"], recommended: ["Operating Systems Concepts"] },

  // ── Web Development ─────────────────────────────────────────────────────────
  { name: "HTML & CSS", level: "beginner", category: "Web Development", description: "Structuring and styling web pages." },
  { name: "JavaScript Basics", level: "beginner", category: "Web Development", description: "Scripting the browser with JavaScript.", prerequisites: ["Variables & Control Flow", "HTML & CSS"] },
  { name: "DOM & Browser APIs", level: "intermediate", category: "Web Development", description: "Manipulating pages and working with browser APIs.", prerequisites: ["JavaScript Basics"] },
  { name: "Frontend Frameworks (React)", level: "intermediate", category: "Web Development", description: "Building component-driven UIs with React.", prerequisites: ["DOM & Browser APIs"], recommended: ["Functions & Scope"] },
  { name: "State Management", level: "advanced", category: "Web Development", description: "Managing complex client-side application state.", prerequisites: ["Frontend Frameworks (React)"] },
  { name: "REST API Design", level: "intermediate", category: "Web Development", description: "Designing resource-oriented HTTP APIs.", prerequisites: ["Functions & Scope"], recommended: ["Networking Fundamentals"] },
  { name: "Node.js & Express", level: "intermediate", category: "Web Development", description: "Server-side JavaScript with Express.", prerequisites: ["JavaScript Basics", "REST API Design"] },
  { name: "Authentication & Security Basics", level: "advanced", category: "Web Development", description: "Sessions, tokens and the common web vulnerability classes.", prerequisites: ["Node.js & Express"], recommended: ["Networking Fundamentals"] },
  { name: "GraphQL", level: "advanced", category: "Web Development", description: "Query-driven APIs with GraphQL.", prerequisites: ["REST API Design", "Node.js & Express"] },
  { name: "Full-Stack Web Development", level: "advanced", category: "Web Development", description: "Shipping complete web applications end to end.", prerequisites: ["Frontend Frameworks (React)", "Node.js & Express"], recommended: ["Relational Database Design"] },

  // ── Data & Databases ────────────────────────────────────────────────────────
  { name: "SQL Fundamentals", level: "beginner", category: "Data & Databases", description: "Querying relational data with SQL.", prerequisites: ["Programming Basics"] },
  { name: "Relational Database Design", level: "intermediate", category: "Data & Databases", description: "Normalization, schema design and joins.", prerequisites: ["SQL Fundamentals"] },
  { name: "NoSQL Databases", level: "intermediate", category: "Data & Databases", description: "Document, key-value and wide-column stores.", prerequisites: ["SQL Fundamentals"] },
  { name: "Graph Database Modeling", level: "advanced", category: "Data & Databases", description: "Modeling connected data as nodes and relationships.", prerequisites: ["Relational Database Design", "Data Structures"] },
  { name: "Database Performance Tuning", level: "advanced", category: "Data & Databases", description: "Indexing, query plans and optimization.", prerequisites: ["Relational Database Design"], recommended: ["Operating Systems Concepts"] },

  // ── Data Science & ML ───────────────────────────────────────────────────────
  { name: "Statistics Fundamentals", level: "beginner", category: "Data Science & ML", description: "Descriptive and inferential statistics.", prerequisites: ["Programming Basics"] },
  { name: "Linear Algebra", level: "intermediate", category: "Data Science & ML", description: "Vectors, matrices and linear transformations.", recommended: ["Statistics Fundamentals"] },
  { name: "Data Analysis with Python", level: "intermediate", category: "Data Science & ML", description: "Wrangling and analysing data with pandas and NumPy.", prerequisites: ["Statistics Fundamentals", "Data Structures"] },
  { name: "Data Visualization", level: "intermediate", category: "Data Science & ML", description: "Communicating insight through charts.", prerequisites: ["Data Analysis with Python"] },
  { name: "Machine Learning Fundamentals", level: "advanced", category: "Data Science & ML", description: "Supervised and unsupervised learning.", prerequisites: ["Data Analysis with Python", "Algorithms"], recommended: ["Linear Algebra"] },
  { name: "Deep Learning", level: "advanced", category: "Data Science & ML", description: "Neural networks, backpropagation and training dynamics.", prerequisites: ["Machine Learning Fundamentals", "Linear Algebra"] },
  { name: "Natural Language Processing", level: "advanced", category: "Data Science & ML", description: "Teaching machines to process human language.", prerequisites: ["Machine Learning Fundamentals"], recommended: ["Deep Learning"] },
  { name: "Computer Vision", level: "advanced", category: "Data Science & ML", description: "Extracting meaning from images and video.", prerequisites: ["Deep Learning"] },
  { name: "MLOps", level: "advanced", category: "Data Science & ML", description: "Deploying, monitoring and retraining models in production.", prerequisites: ["Machine Learning Fundamentals", "DevOps Fundamentals"], recommended: ["Containers with Docker"] },

  // ── DevOps & Cloud ──────────────────────────────────────────────────────────
  { name: "Command Line & Linux Basics", level: "beginner", category: "DevOps & Cloud", description: "Navigating and scripting a Unix shell.", prerequisites: ["Programming Basics"] },
  { name: "Version Control with Git", level: "beginner", category: "DevOps & Cloud", description: "Tracking and collaborating on code changes.", prerequisites: ["Command Line & Linux Basics"] },
  { name: "DevOps Fundamentals", level: "intermediate", category: "DevOps & Cloud", description: "The practices connecting development and operations.", prerequisites: ["Command Line & Linux Basics", "Version Control with Git"] },
  { name: "Containers with Docker", level: "intermediate", category: "DevOps & Cloud", description: "Packaging applications into portable containers.", prerequisites: ["DevOps Fundamentals"], recommended: ["Operating Systems Concepts"] },
  { name: "CI/CD Pipelines", level: "intermediate", category: "DevOps & Cloud", description: "Automating build, test and release.", prerequisites: ["DevOps Fundamentals", "Version Control with Git"] },
  { name: "Kubernetes Orchestration", level: "advanced", category: "DevOps & Cloud", description: "Orchestrating containers at scale.", prerequisites: ["Containers with Docker"], recommended: ["Networking Fundamentals"] },
  { name: "Cloud Infrastructure (AWS/GCP)", level: "advanced", category: "DevOps & Cloud", description: "Provisioning and running workloads in the cloud.", prerequisites: ["Containers with Docker", "CI/CD Pipelines"] },
  { name: "Infrastructure as Code", level: "advanced", category: "DevOps & Cloud", description: "Declaratively managing infrastructure with Terraform and friends.", prerequisites: ["Cloud Infrastructure (AWS/GCP)"] },

  // ── Systems & Networking ────────────────────────────────────────────────────
  { name: "Networking Fundamentals", level: "beginner", category: "Systems & Networking", description: "Packets, protocols and how machines talk to each other.", prerequisites: ["Programming Basics"] },
  { name: "Operating Systems Concepts", level: "intermediate", category: "Systems & Networking", description: "Processes, memory management and scheduling.", prerequisites: ["Command Line & Linux Basics"] },
  { name: "Distributed Systems", level: "advanced", category: "Systems & Networking", description: "Consistency, consensus and fault tolerance across machines.", prerequisites: ["Networking Fundamentals", "Operating Systems Concepts", "Data Structures"], recommended: ["Concurrency & Async"] },
  { name: "System Design", level: "advanced", category: "Systems & Networking", description: "Designing large-scale software systems under real constraints.", prerequisites: ["Distributed Systems", "Relational Database Design"], recommended: ["Database Performance Tuning"] },

  // ── Mobile Development ──────────────────────────────────────────────────────
  { name: "Mobile UI Basics", level: "beginner", category: "Mobile Development", description: "Principles of touch-first interface design.", prerequisites: ["Programming Basics"] },
  { name: "iOS Development with Swift", level: "intermediate", category: "Mobile Development", description: "Building native iOS apps with Swift.", prerequisites: ["Object-Oriented Programming", "Mobile UI Basics"] },
  { name: "Android Development with Kotlin", level: "intermediate", category: "Mobile Development", description: "Building native Android apps with Kotlin.", prerequisites: ["Object-Oriented Programming", "Mobile UI Basics"] },
  { name: "Cross-Platform Development (React Native)", level: "advanced", category: "Mobile Development", description: "One codebase for iOS and Android with React Native.", prerequisites: ["Frontend Frameworks (React)", "Mobile UI Basics"] },
];

export const courses: CourseSeed[] = [
  // ── Programming Fundamentals ────────────────────────────────────────────────
  { title: "Intro to Programming", provider: "freeCodeCamp", hours: 12, level: "beginner", description: "Your first steps writing and running code.", teaches: ["Programming Basics"], alsoCovers: ["Variables & Control Flow"] },
  { title: "Programming Logic: Variables & Loops", provider: "Codecademy", hours: 8, level: "beginner", description: "Control the flow of your programs.", teaches: ["Variables & Control Flow"], requires: ["Programming Basics"] },
  { title: "Functions & Program Structure", provider: "Codecademy", hours: 6, level: "beginner", description: "Write clean, reusable functions.", teaches: ["Functions & Scope"], requires: ["Variables & Control Flow"] },
  { title: "Data Structures Deep Dive", provider: "Coursera", hours: 20, level: "intermediate", description: "Master the building blocks of efficient code.", teaches: ["Data Structures"], alsoCovers: ["Recursion"], requires: ["Functions & Scope"] },
  { title: "Algorithms: Design & Analysis", provider: "Coursera", hours: 24, level: "intermediate", description: "Classic algorithms and complexity analysis.", teaches: ["Algorithms"], requires: ["Data Structures"] },
  { title: "Object-Oriented Design", provider: "Udemy", hours: 14, level: "intermediate", description: "Model software the object-oriented way.", teaches: ["Object-Oriented Programming"], requires: ["Functions & Scope"] },
  { title: "Recursion & Backtracking", provider: "Udemy", hours: 10, level: "intermediate", description: "Think recursively to solve hard problems.", teaches: ["Recursion"], requires: ["Functions & Scope"] },
  { title: "Concurrent Programming Patterns", provider: "Pluralsight", hours: 16, level: "advanced", description: "Write safe concurrent and asynchronous code.", teaches: ["Concurrency & Async"], requires: ["Data Structures"] },

  // ── Web Development ─────────────────────────────────────────────────────────
  { title: "Web Fundamentals: HTML & CSS", provider: "freeCodeCamp", hours: 15, level: "beginner", description: "Structure and style the modern web.", teaches: ["HTML & CSS"] },
  { title: "JavaScript for Beginners", provider: "freeCodeCamp", hours: 18, level: "beginner", description: "Bring web pages to life with JavaScript.", teaches: ["JavaScript Basics"], alsoCovers: ["DOM & Browser APIs"], requires: ["Variables & Control Flow", "HTML & CSS"] },
  { title: "Mastering the DOM", provider: "Codecademy", hours: 9, level: "intermediate", description: "Build interactive pages with browser APIs.", teaches: ["DOM & Browser APIs"], requires: ["JavaScript Basics"] },
  { title: "React from Scratch", provider: "Udemy", hours: 22, level: "intermediate", description: "Build modern component-driven UIs with React.", teaches: ["Frontend Frameworks (React)"], alsoCovers: ["State Management"], requires: ["DOM & Browser APIs"] },
  { title: "Advanced State Management", provider: "Udemy", hours: 12, level: "advanced", description: "Redux, context and state machines in practice.", teaches: ["State Management"], requires: ["Frontend Frameworks (React)"] },
  { title: "Designing REST APIs", provider: "Pluralsight", hours: 10, level: "intermediate", description: "Principles of resource-oriented API design.", teaches: ["REST API Design"], requires: ["Functions & Scope"] },
  { title: "Node.js & Express in Practice", provider: "Udemy", hours: 20, level: "intermediate", description: "Build production APIs with Node.js and Express.", teaches: ["Node.js & Express"], requires: ["JavaScript Basics", "REST API Design"] },
  { title: "Web Security Essentials", provider: "edX", hours: 14, level: "advanced", description: "Auth, sessions and the OWASP top ten.", teaches: ["Authentication & Security Basics"], requires: ["Node.js & Express"] },
  { title: "GraphQL APIs in Depth", provider: "Udemy", hours: 13, level: "advanced", description: "Design and serve GraphQL APIs.", teaches: ["GraphQL"], requires: ["REST API Design", "Node.js & Express"] },
  { title: "Full-Stack Capstone", provider: "Wexa Academy", hours: 30, level: "advanced", description: "Ship a complete web application end to end.", teaches: ["Full-Stack Web Development"], alsoCovers: ["Authentication & Security Basics"], requires: ["Frontend Frameworks (React)", "Node.js & Express"] },

  // ── Data & Databases ────────────────────────────────────────────────────────
  { title: "SQL for Data People", provider: "DataCamp", hours: 10, level: "beginner", description: "Query relational data with confidence.", teaches: ["SQL Fundamentals"], requires: ["Programming Basics"] },
  { title: "Relational Database Design", provider: "Coursera", hours: 16, level: "intermediate", description: "Schemas, normalization and joins.", teaches: ["Relational Database Design"], requires: ["SQL Fundamentals"] },
  { title: "NoSQL in Practice", provider: "Pluralsight", hours: 12, level: "intermediate", description: "Document, key-value and wide-column stores.", teaches: ["NoSQL Databases"], requires: ["SQL Fundamentals"] },
  { title: "Modeling Connected Data with Graphs", provider: "Wexa Academy", hours: 14, level: "advanced", description: "Think in nodes, relationships and traversals.", teaches: ["Graph Database Modeling"], requires: ["Relational Database Design", "Data Structures"] },
  { title: "Query Performance & Indexing", provider: "Pluralsight", hours: 11, level: "advanced", description: "Make slow queries fast.", teaches: ["Database Performance Tuning"], requires: ["Relational Database Design"] },

  // ── Data Science & ML ───────────────────────────────────────────────────────
  { title: "Statistics for Everyone", provider: "Khan Academy", hours: 12, level: "beginner", description: "Descriptive and inferential statistics from scratch.", teaches: ["Statistics Fundamentals"], requires: ["Programming Basics"] },
  { title: "Linear Algebra Refresher", provider: "MIT OpenCourseWare", hours: 18, level: "intermediate", description: "Vectors, matrices and transformations.", teaches: ["Linear Algebra"] },
  { title: "Data Analysis with Python", provider: "DataCamp", hours: 20, level: "intermediate", description: "pandas, NumPy and tidy data workflows.", teaches: ["Data Analysis with Python"], alsoCovers: ["Data Visualization"], requires: ["Statistics Fundamentals", "Data Structures"] },
  { title: "Data Visualization Masterclass", provider: "DataCamp", hours: 9, level: "intermediate", description: "Tell honest stories with charts.", teaches: ["Data Visualization"], requires: ["Data Analysis with Python"] },
  { title: "Machine Learning Fundamentals", provider: "Coursera", hours: 28, level: "advanced", description: "Supervised and unsupervised learning end to end.", teaches: ["Machine Learning Fundamentals"], requires: ["Data Analysis with Python", "Algorithms"] },
  { title: "Deep Learning Specialization", provider: "Coursera", hours: 32, level: "advanced", description: "Neural networks from the ground up.", teaches: ["Deep Learning"], alsoCovers: ["Computer Vision", "Natural Language Processing"], requires: ["Machine Learning Fundamentals", "Linear Algebra"] },
  { title: "NLP with Transformers", provider: "Hugging Face", hours: 18, level: "advanced", description: "Modern language models in practice.", teaches: ["Natural Language Processing"], requires: ["Machine Learning Fundamentals"] },
  { title: "Computer Vision in Practice", provider: "Udemy", hours: 20, level: "advanced", description: "Image classification, detection and segmentation.", teaches: ["Computer Vision"], requires: ["Deep Learning"] },
  { title: "MLOps: Shipping ML to Production", provider: "Wexa Academy", hours: 16, level: "advanced", description: "Deploy, monitor and retrain models reliably.", teaches: ["MLOps"], requires: ["Machine Learning Fundamentals", "DevOps Fundamentals"] },

  // ── DevOps & Cloud ──────────────────────────────────────────────────────────
  { title: "Linux & the Command Line", provider: "freeCodeCamp", hours: 8, level: "beginner", description: "Get genuinely comfortable in the shell.", teaches: ["Command Line & Linux Basics"], requires: ["Programming Basics"] },
  { title: "Git & GitHub Essentials", provider: "Codecademy", hours: 6, level: "beginner", description: "Version control the way real teams use it.", teaches: ["Version Control with Git"], requires: ["Command Line & Linux Basics"] },
  { title: "DevOps Foundations", provider: "Pluralsight", hours: 12, level: "intermediate", description: "Bridging development and operations.", teaches: ["DevOps Fundamentals"], alsoCovers: ["CI/CD Pipelines"], requires: ["Command Line & Linux Basics", "Version Control with Git"] },
  { title: "Docker for Developers", provider: "Udemy", hours: 14, level: "intermediate", description: "Package and run containerized applications.", teaches: ["Containers with Docker"], requires: ["DevOps Fundamentals"] },
  { title: "Building CI/CD Pipelines", provider: "Pluralsight", hours: 13, level: "intermediate", description: "Automate build, test and deploy.", teaches: ["CI/CD Pipelines"], requires: ["DevOps Fundamentals", "Version Control with Git"] },
  { title: "Kubernetes in Action", provider: "Google Cloud Skills Boost", hours: 20, level: "advanced", description: "Orchestrate containers at scale.", teaches: ["Kubernetes Orchestration"], requires: ["Containers with Docker"] },
  { title: "Cloud Infrastructure Essentials", provider: "AWS Training", hours: 22, level: "advanced", description: "Provision and operate cloud workloads.", teaches: ["Cloud Infrastructure (AWS/GCP)"], alsoCovers: ["Infrastructure as Code"], requires: ["Containers with Docker", "CI/CD Pipelines"] },
  { title: "Infrastructure as Code with Terraform", provider: "AWS Training", hours: 15, level: "advanced", description: "Declarative, reviewable infrastructure.", teaches: ["Infrastructure as Code"], requires: ["Cloud Infrastructure (AWS/GCP)"] },

  // ── Systems & Networking ────────────────────────────────────────────────────
  { title: "How Networks Work", provider: "Khan Academy", hours: 9, level: "beginner", description: "Packets, protocols and the internet.", teaches: ["Networking Fundamentals"], requires: ["Programming Basics"] },
  { title: "Operating Systems Concepts", provider: "MIT OpenCourseWare", hours: 20, level: "intermediate", description: "Processes, memory and scheduling.", teaches: ["Operating Systems Concepts"], requires: ["Command Line & Linux Basics"] },
  { title: "Distributed Systems Fundamentals", provider: "MIT OpenCourseWare", hours: 26, level: "advanced", description: "Consensus, replication and fault tolerance.", teaches: ["Distributed Systems"], requires: ["Networking Fundamentals", "Operating Systems Concepts", "Data Structures"] },
  { title: "System Design Interview Prep", provider: "Wexa Academy", hours: 18, level: "advanced", description: "Design systems that scale, and defend your choices.", teaches: ["System Design"], requires: ["Distributed Systems", "Relational Database Design"] },

  // ── Mobile Development ──────────────────────────────────────────────────────
  { title: "Mobile Design Principles", provider: "Coursera", hours: 8, level: "beginner", description: "Design touch-first interfaces people understand.", teaches: ["Mobile UI Basics"], requires: ["Programming Basics"] },
  { title: "iOS Development with Swift", provider: "Udemy", hours: 24, level: "intermediate", description: "Build and ship native iOS apps.", teaches: ["iOS Development with Swift"], requires: ["Object-Oriented Programming", "Mobile UI Basics"] },
  { title: "Android Development with Kotlin", provider: "Udemy", hours: 24, level: "intermediate", description: "Build and ship native Android apps.", teaches: ["Android Development with Kotlin"], requires: ["Object-Oriented Programming", "Mobile UI Basics"] },
  { title: "Cross-Platform Apps with React Native", provider: "Udemy", hours: 18, level: "advanced", description: "One codebase, two platforms.", teaches: ["Cross-Platform Development (React Native)"], requires: ["Frontend Frameworks (React)", "Mobile UI Basics"] },
];

export const roles: RoleSeed[] = [
  {
    title: "Frontend Engineer",
    description: "Builds the interfaces people actually touch, with an eye for performance and accessibility.",
    core: ["HTML & CSS", "JavaScript Basics", "DOM & Browser APIs", "Frontend Frameworks (React)", "State Management", "Version Control with Git"],
    niceToHave: ["Cross-Platform Development (React Native)", "Authentication & Security Basics"],
  },
  {
    title: "Backend Engineer",
    description: "Designs and runs the APIs and data layers everything else depends on.",
    core: ["Functions & Scope", "REST API Design", "Node.js & Express", "Relational Database Design", "Authentication & Security Basics", "Version Control with Git"],
    niceToHave: ["GraphQL", "Database Performance Tuning", "Containers with Docker"],
  },
  {
    title: "Full-Stack Engineer",
    description: "Owns features end to end, from database schema through to the rendered UI.",
    core: ["Full-Stack Web Development", "Relational Database Design", "Authentication & Security Basics", "Version Control with Git"],
    niceToHave: ["Cloud Infrastructure (AWS/GCP)", "GraphQL", "State Management"],
  },
  {
    title: "Data Analyst",
    description: "Turns raw data into decisions leadership can act on.",
    core: ["SQL Fundamentals", "Statistics Fundamentals", "Data Analysis with Python", "Data Visualization"],
    niceToHave: ["NoSQL Databases", "Machine Learning Fundamentals"],
  },
  {
    title: "Machine Learning Engineer",
    description: "Trains models and — crucially — keeps them working in production.",
    core: ["Data Analysis with Python", "Linear Algebra", "Machine Learning Fundamentals", "Deep Learning", "MLOps"],
    niceToHave: ["Natural Language Processing", "Computer Vision", "Containers with Docker"],
  },
  {
    title: "Data Engineer",
    description: "Builds the pipelines and stores that make data usable at scale.",
    core: ["SQL Fundamentals", "Relational Database Design", "Data Analysis with Python", "Containers with Docker", "Distributed Systems"],
    niceToHave: ["Graph Database Modeling", "Database Performance Tuning", "Cloud Infrastructure (AWS/GCP)"],
  },
  {
    title: "DevOps Engineer",
    description: "Automates the path from a commit to running, observable production software.",
    core: ["Command Line & Linux Basics", "Version Control with Git", "DevOps Fundamentals", "Containers with Docker", "CI/CD Pipelines", "Cloud Infrastructure (AWS/GCP)"],
    niceToHave: ["Kubernetes Orchestration", "Infrastructure as Code", "Networking Fundamentals"],
  },
  {
    title: "Site Reliability Engineer",
    description: "Keeps large systems up, fast and debuggable under real-world failure.",
    core: ["Operating Systems Concepts", "Networking Fundamentals", "Distributed Systems", "Kubernetes Orchestration", "System Design"],
    niceToHave: ["Infrastructure as Code", "Database Performance Tuning", "Concurrency & Async"],
  },
  {
    title: "Mobile Engineer",
    description: "Ships native or cross-platform apps to phones in people's pockets.",
    core: ["Object-Oriented Programming", "Mobile UI Basics", "iOS Development with Swift", "Android Development with Kotlin"],
    niceToHave: ["Cross-Platform Development (React Native)", "REST API Design"],
  },
];

/** Providers are derived from the courses above so the two can never drift apart. */
export const providers = [...new Set(courses.map((c) => c.provider))].sort();
