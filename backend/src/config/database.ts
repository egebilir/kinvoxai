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

    CREATE TABLE IF NOT EXISTS stories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      job_id TEXT NOT NULL UNIQUE REFERENCES jobs(id),
      baslik TEXT NOT NULL,
      hikaye TEXT NOT NULL,
      seslendirme TEXT NOT NULL,
      sahneler_tr TEXT NOT NULL,
      sahneler_en TEXT NOT NULL,
      image_paths TEXT,
      visual_style_guide TEXT,
      prompt TEXT NOT NULL,
      style TEXT NOT NULL,
      duration TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_stories_job_id ON stories(job_id);
  `);

  // Migrate: add columns for databases created before these fields existed
  const storyColumns = db.prepare("PRAGMA table_info(stories)").all() as { name: string }[];
  if (!storyColumns.some((col) => col.name === "image_paths")) {
    db.exec("ALTER TABLE stories ADD COLUMN image_paths TEXT");
  }
  if (!storyColumns.some((col) => col.name === "visual_style_guide")) {
    db.exec("ALTER TABLE stories ADD COLUMN visual_style_guide TEXT");
  }

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
