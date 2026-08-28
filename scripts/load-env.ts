/**
 * Loads environment variables for standalone scripts.
 * Next.js reads .env.local automatically, but plain `tsx` scripts do not —
 * so mirror Next's precedence here: .env.local wins, .env fills the gaps.
 */
import { config } from "dotenv";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(__dirname, "..");

for (const file of [".env.local", ".env"]) {
  const path = resolve(root, file);
  if (existsSync(path)) config({ path, override: false, quiet: true });
}

export function requireConnectionEnv() {
  const uri = process.env.NEO4J_URI;
  const username = process.env.NEO4J_USERNAME;
  const password = process.env.NEO4J_PASSWORD;

  if (!uri || !username || !password) {
    console.error(
      "Missing NEO4J_URI / NEO4J_USERNAME / NEO4J_PASSWORD.\n" +
        "Copy .env.example to .env.local and fill in your CognoDB connection details."
    );
    process.exit(1);
  }

  return { uri, username, password };
}
