export type Level = "beginner" | "intermediate" | "advanced";

export interface SkillSeed {
  name: string;
  level: Level;
  category: string;
  description: string;
  /** Direct prerequisite skills (edges: prereq -[:PREREQUISITE_OF]-> this skill) */
  prerequisites?: string[];
}

export interface CourseSeed {
  title: string;
  provider: string;
  hours: number;
  level: Level;
  description: string;
  /** Skills this course teaches (edges: course -[:TEACHES]-> skill) */
  teaches: string[];
  /** Skills a learner should already have (edges: course -[:REQUIRES]-> skill) */
  requires?: string[];
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
  // Programming Fundamentals
  { name: "Programming Basics", level: "beginner", category: "Programming Fundamentals", description: "Core notions of writing and running a program." },
  { name: "Variables & Control Flow", level: "beginner", category: "Programming Fundamentals", description: "Variables, conditionals and loops.", prerequisites: ["Programming Basics"] },
  { name: "Functions & Scope", level: "beginner", category: "Programming Fundamentals", description: "Decomposing programs into reusable functions.", prerequisites: ["Variables & Control Flow"] },
  { name: "Data Structures", level: "intermediate", category: "Programming Fundamentals", description: "Arrays, lists, stacks, queues, trees, hash maps.", prerequisites: ["Functions & Scope"] },
  { name: "Algorithms", level: "intermediate", category: "Programming Fundamentals", description: "Sorting, searching and algorithmic complexity.", prerequisites: ["Data Structures"] },
  { name: "Object-Oriented Programming", level: "intermediate", category: "Programming Fundamentals", description: "Classes, objects, inheritance and polymorphism.", prerequisites: ["Functions & Scope"] },
  { name: "Recursion", level: "intermediate", category: "Programming Fundamentals", description: "Solving problems by self-reference.", prerequisites: ["Functions & Scope"] },
  { name: "Concurrency & Async", level: "advanced", category: "Programming Fundamentals", description: "Threads, async/await and race conditions.", prerequisites: ["Data Structures"] },

  // Web Development
  { name: "HTML & CSS", level: "beginner", category: "Web Development", description: "Structuring and styling web pages." },
  { name: "JavaScript Basics", level: "beginner", category: "Web Development", description: "Scripting the browser with JavaScript.", prerequisites: ["Variables & Control Flow", "HTML & CSS"] },
  { name: "DOM & Browser APIs", level: "intermediate", category: "Web Development", description: "Manipulating pages and talking to browser APIs.", prerequisites: ["JavaScript Basics"] },
  { name: "Frontend Frameworks (React)", level: "intermediate", category: "Web Development", description: "Building component-driven UIs with React.", prerequisites: ["DOM & Browser APIs"] },
  { name: "State Management", level: "advanced", category: "Web Development", description: "Managing complex client-side application state.", prerequisites: ["Frontend Frameworks (React)"] },
  { name: "REST API Design", level: "intermediate", category: "Web Development", description: "Designing resource-oriented HTTP APIs.", prerequisites: ["Functions & Scope"] },
  { name: "Node.js & Express", level: "intermediate", category: "Web Development", description: "Server-side JavaScript with Express.", prerequisites: ["JavaScript Basics", "REST API Design"] },
  { name: "Authentication & Security Basics", level: "advanced", category: "Web Development", description: "Sessions, tokens and common web vulnerabilities.", prerequisites: ["Node.js & Express"] },
  { name: "GraphQL", level: "advanced", category: "Web Development", description: "Query-driven APIs with GraphQL.", prerequisites: ["REST API Design", "Node.js & Express"] },
  { name: "Full-Stack Web Development", level: "advanced", category: "Web Development", description: "Shipping complete web applications end to end.", prerequisites: ["Frontend Frameworks (React)", "Node.js & Express"] },

  // Data & Databases
  { name: "SQL Fundamentals", level: "beginner", category: "Data & Databases", description: "Querying relational data with SQL.", prerequisites: ["Programming Basics"] },
  { name: "Relational Database Design", level: "intermediate", category: "Data & Databases", description: "Normalization, schemas and joins.", prerequisites: ["SQL Fundamentals"] },
  { name: "NoSQL Databases", level: "intermediate", category: "Data & Databases", description: "Document, key-value and wide-column stores.", prerequisites: ["SQL Fundamentals"] },
  { name: "Graph Database Modeling", level: "advanced", category: "Data & Databases", description: "Modeling connected data as nodes and relationships.", prerequisites: ["Relational Database Design", "Data Structures"] },
  { name: "Database Performance Tuning", level: "advanced", category: "Data & Databases", description: "Indexing, query plans and optimization.", prerequisites: ["Relational Database Design"] },

  // Data Science & ML
  { name: "Statistics Fundamentals", level: "beginner", category: "Data Science & ML", description: "Descriptive and inferential statistics.", prerequisites: ["Programming Basics"] },
  { name: "Linear Algebra", level: "intermediate", category: "Data Science & ML", description: "Vectors, matrices and transformations.", prerequisites: ["Statistics Fundamentals"] },
  { name: "Data Analysis with Python", level: "intermediate", category: "Data Science & ML", description: "Wrangling data with pandas and NumPy.", prerequisites: ["Statistics Fundamentals", "Data Structures"] },
  { name: "Data Visualization", level: "intermediate", category: "Data Science & ML", description: "Communicating insight through charts.", prerequisites: ["Data Analysis with Python"] },
  { name: "Machine Learning Fundamentals", level: "advanced", category: "Data Science & ML", description: "Supervised and unsupervised learning basics.", prerequisites: ["Data Analysis with Python", "Algorithms"] },
  { name: "Deep Learning", level: "advanced", category: "Data Science & ML", description: "Neural networks and backpropagation.", prerequisites: ["Machine Learning Fundamentals", "Linear Algebra"] },
  { name: "Natural Language Processing", level: "advanced", category: "Data Science & ML", description: "Teaching machines to process language.", prerequisites: ["Machine Learning Fundamentals"] },
  { name: "Computer Vision", level: "advanced", category: "Data Science & ML", description: "Extracting meaning from images and video.", prerequisites: ["Deep Learning"] },
  { name: "MLOps", level: "advanced", category: "Data Science & ML", description: "Deploying and monitoring ML models in production.", prerequisites: ["Machine Learning Fundamentals", "DevOps Fundamentals"] },

  // DevOps & Cloud
  { name: "Command Line & Linux Basics", level: "beginner", category: "DevOps & Cloud", description: "Navigating and scripting a Unix shell.", prerequisites: ["Programming Basics"] },
  { name: "Version Control with Git", level: "beginner", category: "DevOps & Cloud", description: "Tracking and collaborating on code changes.", prerequisites: ["Command Line & Linux Basics"] },
  { name: "DevOps Fundamentals", level: "intermediate", category: "DevOps & Cloud", description: "Culture and practices connecting dev and ops.", prerequisites: ["Command Line & Linux Basics", "Version Control with Git"] },
  { name: "Containers with Docker", level: "intermediate", category: "DevOps & Cloud", description: "Packaging applications into containers.", prerequisites: ["DevOps Fundamentals"] },
  { name: "CI/CD Pipelines", level: "intermediate", category: "DevOps & Cloud", description: "Automating build, test and release.", prerequisites: ["DevOps Fundamentals", "Version Control with Git"] },
  { name: "Kubernetes Orchestration", level: "advanced", category: "DevOps & Cloud", description: "Orchestrating containers at scale.", prerequisites: ["Containers with Docker"] },
  { name: "Cloud Infrastructure (AWS/GCP)", level: "advanced", category: "DevOps & Cloud", description: "Provisioning and running workloads in the cloud.", prerequisites: ["Containers with Docker", "CI/CD Pipelines"] },
  { name: "Infrastructure as Code", level: "advanced", category: "DevOps & Cloud", description: "Declaratively managing infrastructure.", prerequisites: ["Cloud Infrastructure (AWS/GCP)"] },

  // Systems & Networking
  { name: "Networking Fundamentals", level: "beginner", category: "Systems & Networking", description: "How computers talk to each other.", prerequisites: ["Programming Basics"] },
  { name: "Operating Systems Concepts", level: "intermediate", category: "Systems & Networking", description: "Processes, memory and scheduling.", prerequisites: ["Command Line & Linux Basics"] },
  { name: "Distributed Systems", level: "advanced", category: "Systems & Networking", description: "Consistency, consensus and fault tolerance.", prerequisites: ["Networking Fundamentals", "Operating Systems Concepts", "Data Structures"] },
  { name: "System Design", level: "advanced", category: "Systems & Networking", description: "Designing large-scale software systems.", prerequisites: ["Distributed Systems", "Relational Database Design"] },

  // Mobile Development
  { name: "Mobile UI Basics", level: "beginner", category: "Mobile Development", description: "Principles of touch-first interface design.", prerequisites: ["Programming Basics"] },
  { name: "iOS Development with Swift", level: "intermediate", category: "Mobile Development", description: "Building native iOS apps with Swift.", prerequisites: ["Object-Oriented Programming", "Mobile UI Basics"] },
  { name: "Android Development with Kotlin", level: "intermediate", category: "Mobile Development", description: "Building native Android apps with Kotlin.", prerequisites: ["Object-Oriented Programming", "Mobile UI Basics"] },
  { name: "Cross-Platform Development (React Native)", level: "advanced", category: "Mobile Development", description: "One codebase for iOS and Android with React Native.", prerequisites: ["Frontend Frameworks (React)", "Mobile UI Basics"] },
];

export const courses: CourseSeed[] = [
  { title: "Intro to Programming", provider: "freeCodeCamp", hours: 12, level: "beginner", description: "Your first steps writing code.", teaches: ["Programming Basics"] },
  { title: "Programming Logic: Variables & Loops", provider: "Codecademy", hours: 8, level: "beginner", description: "Control the flow of your programs.", teaches: ["Variables & Control Flow"], requires: ["Programming Basics"] },
  { title: "Functions & Program Structure", provider: "Codecademy", hours: 6, level: "beginner", description: "Write clean, reusable functions.", teaches: ["Functions & Scope"], requires: ["Variables & Control Flow"] },
  { title: "Data Structures Deep Dive", provider: "Coursera", hours: 20, level: "intermediate", description: "Master the building blocks of efficient code.", teaches: ["Data Structures"], requires: ["Functions & Scope"] },
  { title: "Algorithms: Design & Analysis", provider: "Coursera", hours: 24, level: "intermediate", description: "Classic algorithms and complexity analysis.", teaches: ["Algorithms"], requires: ["Data Structures"] },
  { title: "Object-Oriented Design", provider: "Udemy", hours: 14, level: "intermediate", description: "Model software the OOP way.", teaches: ["Object-Oriented Programming"], requires: ["Functions & Scope"] },
  { title: "Recursion & Backtracking", provider: "Udemy", hours: 10, level: "intermediate", description: "Think recursively to solve hard problems.", teaches: ["Recursion"], requires: ["Functions & Scope"] },
  { title: "Concurrent Programming Patterns", provider: "Pluralsight", hours: 16, level: "advanced", description: "Write safe concurrent and async code.", teaches: ["Concurrency & Async"], requires: ["Data Structures"] },

  { title: "Web Fundamentals: HTML & CSS", provider: "freeCodeCamp", hours: 15, level: "beginner", description: "Structure and style the modern web.", teaches: ["HTML & CSS"] },
  { title: "JavaScript for Beginners", provider: "freeCodeCamp", hours: 18, level: "beginner", description: "Bring web pages to life with JavaScript.", teaches: ["JavaScript Basics"], requires: ["Variables & Control Flow", "HTML & CSS"] },
  { title: "Mastering the DOM", provider: "Codecademy", hours: 9, level: "intermediate", description: "Interactive pages with browser APIs.", teaches: ["DOM & Browser APIs"], requires: ["JavaScript Basics"] },
  { title: "React from Scratch", provider: "Udemy", hours: 22, level: "intermediate", description: "Build modern UIs with React.", teaches: ["Frontend Frameworks (React)"], requires: ["DOM & Browser APIs"] },
  { title: "Advanced State Management", provider: "Udemy", hours: 12, level: "advanced", description: "Redux, context and state machines.", teaches: ["State Management"], requires: ["Frontend Frameworks (React)"] },
  { title: "Designing REST APIs", provider: "Pluralsight", hours: 10, level: "intermediate", description: "Principles of resource-oriented API design.", teaches: ["REST API Design"], requires: ["Functions & Scope"] },
  { title: "Node.js & Express in Practice", provider: "Udemy", hours: 20, level: "intermediate", description: "Build APIs with Node.js and Express.", teaches: ["Node.js & Express"], requires: ["JavaScript Basics", "REST API Design"] },
  { title: "Web Security Essentials", provider: "edX", hours: 14, level: "advanced", description: "Auth, sessions and common vulnerabilities.", teaches: ["Authentication & Security Basics"], requires: ["Node.js & Express"] },
  { title: "GraphQL APIs in Depth", provider: "Udemy", hours: 13, level: "advanced", description: "Design and serve GraphQL APIs.", teaches: ["GraphQL"], requires: ["REST API Design", "Node.js & Express"] },
  { title: "Full-Stack Capstone", provider: "Wexa Academy", hours: 30, level: "advanced", description: "Ship a complete web app end to end.", teaches: ["Full-Stack Web Development"], requires: ["Frontend Frameworks (React)", "Node.js & Express"] },

  { title: "SQL for Data People", provider: "DataCamp", hours: 10, level: "beginner", description: "Query relational data with confidence.", teaches: ["SQL Fundamentals"], requires: ["Programming Basics"] },
  { title: "Relational Database Design", provider: "Coursera", hours: 16, level: "intermediate", description: "Schemas, normalization and joins.", teaches: ["Relational Database Design"], requires: ["SQL Fundamentals"] },
  { title: "NoSQL in Practice", provider: "Pluralsight", hours: 12, level: "intermediate", description: "Document and key-value stores.", teaches: ["NoSQL Databases"], requires: ["SQL Fundamentals"] },
  { title: "Modeling Connected Data with Graphs", provider: "Wexa Academy", hours: 14, level: "advanced", description: "Think in nodes and relationships.", teaches: ["Graph Database Modeling"], requires: ["Relational Database Design", "Data Structures"] },
  { title: "Query Performance & Indexing", provider: "Pluralsight", hours: 11, level: "advanced", description: "Make slow queries fast.", teaches: ["Database Performance Tuning"], requires: ["Relational Database Design"] },

  { title: "Statistics for Everyone", provider: "Khan Academy", hours: 12, level: "beginner", description: "Descriptive and inferential statistics.", teaches: ["Statistics Fundamentals"], requires: ["Programming Basics"] },
  { title: "Linear Algebra Refresher", provider: "MIT OpenCourseWare", hours: 18, level: "intermediate", description: "Vectors, matrices and transformations.", teaches: ["Linear Algebra"], requires: ["Statistics Fundamentals"] },
  { title: "Data Analysis with Python", provider: "DataCamp", hours: 20, level: "intermediate", description: "pandas, NumPy and tidy data.", teaches: ["Data Analysis with Python"], requires: ["Statistics Fundamentals", "Data Structures"] },
  { title: "Data Visualization Masterclass", provider: "DataCamp", hours: 9, level: "intermediate", description: "Tell stories with charts.", teaches: ["Data Visualization"], requires: ["Data Analysis with Python"] },
  { title: "Machine Learning Fundamentals", provider: "Coursera", hours: 28, level: "advanced", description: "Supervised and unsupervised learning.", teaches: ["Machine Learning Fundamentals"], requires: ["Data Analysis with Python", "Algorithms"] },
  { title: "Deep Learning Specialization", provider: "Coursera", hours: 32, level: "advanced", description: "Neural networks from the ground up.", teaches: ["Deep Learning"], requires: ["Machine Learning Fundamentals", "Linear Algebra"] },
  { title: "NLP with Transformers", provider: "Hugging Face", hours: 18, level: "advanced", description: "Modern language models in practice.", teaches: ["Natural Language Processing"], requires: ["Machine Learning Fundamentals"] },
  { title: "Computer Vision in Practice", provider: "Udemy", hours: 20, level: "advanced", description: "Image classification and detection.", teaches: ["Computer Vision"], requires: ["Deep Learning"] },
  { title: "MLOps: Shipping ML to Production", provider: "Wexa Academy", hours: 16, level: "advanced", description: "Deploy, monitor and retrain models.", teaches: ["MLOps"], requires: ["Machine Learning Fundamentals", "DevOps Fundamentals"] },

  { title: "Linux & the Command Line", provider: "freeCodeCamp", hours: 8, level: "beginner", description: "Get comfortable in the shell.", teaches: ["Command Line & Linux Basics"], requires: ["Programming Basics"] },
  { title: "Git & GitHub Essentials", provider: "Codecademy", hours: 6, level: "beginner", description: "Version control for real teams.", teaches: ["Version Control with Git"], requires: ["Command Line & Linux Basics"] },
  { title: "DevOps Foundations", provider: "Pluralsight", hours: 12, level: "intermediate", description: "Bridging development and operations.", teaches: ["DevOps Fundamentals"], requires: ["Command Line & Linux Basics", "Version Control with Git"] },
  { title: "Docker for Developers", provider: "Udemy", hours: 14, level: "intermediate", description: "Package and run containerized apps.", teaches: ["Containers with Docker"], requires: ["DevOps Fundamentals"] },
  { title: "Building CI/CD Pipelines", provider: "Pluralsight", hours: 13, level: "intermediate", description: "Automate build, test and deploy.", teaches: ["CI/CD Pipelines"], requires: ["DevOps Fundamentals", "Version Control with Git"] },
  { title: "Kubernetes in Action", provider: "Google Cloud Skills Boost", hours: 20, level: "advanced", description: "Orchestrate containers at scale.", teaches: ["Kubernetes Orchestration"], requires: ["Containers with Docker"] },
  { title: "Cloud Infrastructure Essentials", provider: "AWS Training", hours: 22, level: "advanced", description: "Provision and run cloud workloads.", teaches: ["Cloud Infrastructure (AWS/GCP)"], requires: ["Containers with Docker", "CI/CD Pipelines"] },
  { title: "Infrastructure as Code with Terraform", provider: "AWS Training", hours: 15, level: "advanced", description: "Declarative infrastructure management.", teaches: ["Infrastructure as Code"], requires: ["Cloud Infrastructure (AWS/GCP)"] },

  { title: "How Networks Work", provider: "Khan Academy", hours: 9, level: "beginner", description: "Packets, protocols and the internet.", teaches: ["Networking Fundamentals"], requires: ["Programming Basics"] },
  { title: "Operating Systems Concepts", provider: "MIT OpenCourseWare", hours: 20, level: "intermediate", description: "Processes, memory and scheduling.", teaches: ["Operating Systems Concepts"], requires: ["Command Line & Linux Basics"] },
  { title: "Distributed Systems Fundamentals", provider: "MIT OpenCourseWare", hours: 26, level: "advanced", description: "Consensus, replication and fault tolerance.", teaches: ["Distributed Systems"], requires: ["Networking Fundamentals", "Operating Systems Concepts", "Data Structures"] },
  { title: "System Design Interview Prep", provider: "Wexa Academy", hours: 18, level: "advanced", description: "Design systems that scale.", teaches: ["System Design"], requires: ["Distributed Systems", "Relational Database Design"] },

  { title: "Mobile Design Principles", provider: "Coursera", hours: 8, level: "beginner", description: "Design touch-first interfaces.", teaches: ["Mobile UI Basics"], requires: ["Programming Basics"] },
  { title: "iOS Development with Swift", provider: "Udemy", hours: 24, level: "intermediate", description: "Build native iOS apps.", teaches: ["iOS Development with Swift"], requires: ["Object-Oriented Programming", "Mobile UI Basics"] },
  { title: "Android Development with Kotlin", provider: "Udemy", hours: 24, level: "intermediate", description: "Build native Android apps.", teaches: ["Android Development with Kotlin"], requires: ["Object-Oriented Programming", "Mobile UI Basics"] },
  { title: "Cross-Platform Apps with React Native", provider: "Udemy", hours: 18, level: "advanced", description: "One codebase, two platforms.", teaches: ["Cross-Platform Development (React Native)"], requires: ["Frontend Frameworks (React)", "Mobile UI Basics"] },
];
