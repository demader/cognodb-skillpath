import neo4j, { type Driver, type ManagedTransaction, type Session } from "neo4j-driver";

let driver: Driver | null = null;

function getDriver(): Driver {
  if (driver) return driver;

  const uri = process.env.NEO4J_URI;
  const user = process.env.NEO4J_USERNAME;
  const password = process.env.NEO4J_PASSWORD;

  if (!uri || !user || !password) {
    throw new Error(
      "Missing CognoDB connection settings. Set NEO4J_URI, NEO4J_USERNAME and NEO4J_PASSWORD in your environment."
    );
  }

  driver = neo4j.driver(uri, neo4j.auth.basic(user, password), {
    // Bolt returns 64-bit integers as {low, high} objects by default, which would
    // silently break arithmetic (hour totals, hop depths). Every integer in this
    // dataset is well inside the safe JS range, so plain numbers are correct here.
    disableLosslessIntegers: true,
    // The free c0 tier allows 200 connections; stay well under it.
    maxConnectionPoolSize: 20,
    connectionAcquisitionTimeout: 10_000,
  });

  return driver;
}

/** Thrown by query helpers when CognoDB can't be reached, so routes can render a graceful state. */
export class DatabaseUnavailableError extends Error {
  constructor(cause: unknown) {
    super("CognoDB is unreachable right now. Please try again shortly.");
    this.name = "DatabaseUnavailableError";
    this.cause = cause;
  }
}

/**
 * Distinguishes "the database is down" from "this query is wrong".
 *
 * Neo4jError codes are dotted strings like
 * `Neo.ClientError.Statement.SyntaxError` (our bug) versus
 * `ServiceUnavailable` / `SessionExpired` (an outage). Treating the first kind as
 * an outage would hide real defects behind a friendly "try again later" and keep
 * them out of the logs entirely.
 */
function isConnectivityFailure(err: unknown): boolean {
  const code = (err as { code?: unknown })?.code;
  if (typeof code !== "string") return true; // no code at all — assume transport
  if (code.startsWith("Neo.ClientError") || code.startsWith("Neo.DatabaseError")) return false;
  return true;
}

async function withSession<T>(work: (session: Session) => Promise<T>): Promise<T> {
  let session: Session;
  try {
    session = getDriver().session();
  } catch (err) {
    throw new DatabaseUnavailableError(err);
  }

  try {
    return await work(session);
  } catch (err) {
    if (err instanceof DatabaseUnavailableError) throw err;
    if (!isConnectivityFailure(err)) throw err; // a real bug — let it surface as a 500
    throw new DatabaseUnavailableError(err);
  } finally {
    await session.close().catch(() => {});
  }
}

/** Run a single parameterized read query and return plain records. */
export async function read<T = Record<string, unknown>>(
  cypher: string,
  params: Record<string, unknown> = {}
): Promise<T[]> {
  return withSession(async (session) => {
    const result = await session.executeRead((tx: ManagedTransaction) => tx.run(cypher, params));
    return result.records.map((r) => r.toObject() as T);
  });
}

/** Run a single parameterized write query and return plain records. */
export async function write<T = Record<string, unknown>>(
  cypher: string,
  params: Record<string, unknown> = {}
): Promise<T[]> {
  return withSession(async (session) => {
    const result = await session.executeWrite((tx: ManagedTransaction) => tx.run(cypher, params));
    return result.records.map((r) => r.toObject() as T);
  });
}

/** Run several write statements in one transaction (used by the seed script). */
export async function writeBatch(
  statements: Array<{ cypher: string; params?: Record<string, unknown> }>
): Promise<void> {
  return withSession(async (session) => {
    await session.executeWrite(async (tx: ManagedTransaction) => {
      for (const { cypher, params = {} } of statements) {
        await tx.run(cypher, params);
      }
    });
  });
}

export async function verifyConnectivity(): Promise<boolean> {
  try {
    await getDriver().verifyConnectivity();
    return true;
  } catch {
    return false;
  }
}

export async function closeDriver(): Promise<void> {
  if (driver) {
    await driver.close();
    driver = null;
  }
}
