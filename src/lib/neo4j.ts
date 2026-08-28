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
