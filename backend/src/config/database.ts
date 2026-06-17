import Database from "better-sqlite3";
import path from "path";

let db: Database.Database | null = null;

const DB_PATH = process.env.DATABASE_PATH || path.resolve(__dirname, "../../../kinvoxai.db");

export function getDb(): Database.Database {
  if (!db) {
    throw new Error("Database not initialized. Call connectDatabase() first.");
  }
  return db;
}

export function connectDatabase(): void {
  db = new Database(DB_PATH);

  // Enable WAL mode for better concurrent read performance
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  // Create tables if they don't exist
  db.exec(`
    CREATE TABLE IF NOT EXISTS jobs (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL DEFAULT 'text',
      prompt TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'queued',
      progress INTEGER NOT NULL DEFAULT 0,
      result TEXT,
      error TEXT,
      options TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
    CREATE INDEX IF NOT EXISTS idx_jobs_created_at ON jobs(created_at);
  `);

  // Verify connection
  const row = db.prepare("SELECT datetime('now') as time").get() as { time: string };
  if (!row.time) {
    throw new Error("SQLite connection verification failed");
  }
}

export function disconnectDatabase(): void {
  if (db) {
    db.close();
    db = null;
  }
}
