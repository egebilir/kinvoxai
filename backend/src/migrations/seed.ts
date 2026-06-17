import dotenv from "dotenv";
dotenv.config({ path: "../.env" });

import { connectDatabase, getDb, disconnectDatabase } from "../config/database";

function seed(): void {
  console.log("🌱 Running KinvoxAI database seed...\n");

  connectDatabase();
  const db = getDb();

  // Tables are auto-created by connectDatabase(), but let's verify
  const tables = db
    .prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
    .all() as { name: string }[];

  console.log("📋 Tables created:");
  tables.forEach((t) => console.log(`   - ${t.name}`));

  // Insert sample data
  const insertJob = db.prepare(`
    INSERT OR IGNORE INTO jobs (id, type, prompt, status, progress, result, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
  `);

  const sampleJobs = [
    {
      id: "job_seed_001",
      type: "text",
      prompt: "Write a short poem about artificial intelligence",
      status: "completed",
      progress: 100,
      result: JSON.stringify({
        text: "Silicon dreams in circuits flow,\nA mind of code begins to grow.\nNot born of flesh, but born of thought,\nA new intelligence is wrought.",
      }),
    },
    {
      id: "job_seed_002",
      type: "image",
      prompt: "A futuristic cityscape at sunset, cyberpunk style",
      status: "completed",
      progress: 100,
      result: JSON.stringify({
        url: "https://placeholder.example.com/generated/cityscape.png",
      }),
    },
    {
      id: "job_seed_003",
      type: "audio",
      prompt: "Welcome to KinvoxAI, your creative AI platform.",
      status: "queued",
      progress: 0,
      result: null,
    },
  ];

  const insertMany = db.transaction(() => {
    for (const job of sampleJobs) {
      insertJob.run(job.id, job.type, job.prompt, job.status, job.progress, job.result);
    }
  });

  insertMany();

  const count = db.prepare("SELECT COUNT(*) as count FROM jobs").get() as { count: number };
  console.log(`\n✅ Seed complete. ${count.count} jobs in database.`);

  disconnectDatabase();
}

seed();
