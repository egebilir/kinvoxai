import { getDb } from "./database";

export interface QueueJob {
  id: string;
  type: string;
  prompt: string;
  status: string;
  progress: number;
  result: string | null;
  error: string | null;
  options: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * In-memory job queue backed by SQLite.
 * Jobs are persisted to the database and processed in-process.
 * For production, swap this with Redis + BullMQ.
 */
export function enqueueJob(
  id: string,
  prompt: string,
  type: string,
  options?: Record<string, unknown>
): QueueJob {
  const db = getDb();

  const stmt = db.prepare(`
    INSERT INTO jobs (id, prompt, type, status, progress, options, created_at, updated_at)
    VALUES (?, ?, ?, 'queued', 0, ?, datetime('now'), datetime('now'))
  `);

  stmt.run(id, prompt, type, options ? JSON.stringify(options) : null);

  const job = db.prepare("SELECT * FROM jobs WHERE id = ?").get(id) as QueueJob;
  return job;
}

export function getJob(id: string): QueueJob | undefined {
  const db = getDb();
  return db.prepare("SELECT * FROM jobs WHERE id = ?").get(id) as QueueJob | undefined;
}

export function updateJobStatus(
  id: string,
  status: string,
  progress?: number,
  result?: string,
  error?: string
): void {
  const db = getDb();

  const updates: string[] = ["status = ?", "updated_at = datetime('now')"];
  const params: (string | number)[] = [status];

  if (progress !== undefined) {
    updates.push("progress = ?");
    params.push(progress);
  }
  if (result !== undefined) {
    updates.push("result = ?");
    params.push(result);
  }
  if (error !== undefined) {
    updates.push("error = ?");
    params.push(error);
  }

  params.push(id);

  db.prepare(`UPDATE jobs SET ${updates.join(", ")} WHERE id = ?`).run(...params);
}

export function listRecentJobs(limit = 50): QueueJob[] {
  const db = getDb();
  return db.prepare("SELECT * FROM jobs ORDER BY created_at DESC LIMIT ?").all(limit) as QueueJob[];
}
