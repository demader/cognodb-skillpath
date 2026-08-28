/**
 * Loads .env.local (then .env) so integration specs can reach CognoDB, mirroring
 * how Next.js resolves environment files.
 */
import { config } from "dotenv";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(__dirname, "..");

for (const file of [".env.local", ".env"]) {
  const path = resolve(root, file);
  if (existsSync(path)) config({ path, override: false, quiet: true });
}

/** True when credentials are present, so DB-backed specs can skip rather than fail. */
export const hasDatabase = Boolean(
  process.env.NEO4J_URI && process.env.NEO4J_USERNAME && process.env.NEO4J_PASSWORD
);
