import { Pool } from "pg";

let pool: Pool | null = null;

export function getPool(): Pool {
  if (!pool) {
    throw new Error("Database not initialized. Call connectDatabase() first.");
  }
  return pool;
}

export async function connectDatabase(): Promise<void> {
  pool = new Pool({
    connectionString:
      process.env.DATABASE_URL ||
      "postgresql://kinvoxai:kinvoxai@localhost:5432/kinvoxai",
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  });

  // Test connection
  const client = await pool.connect();
  await client.query("SELECT NOW()");
  client.release();
}

export async function disconnectDatabase(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}
