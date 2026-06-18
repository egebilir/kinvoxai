import { getJob, updateJobStatus } from "../config/queue";
import { generateStory, type VisualStyleGuide } from "../services/claude";
import { getDb } from "../config/database";

interface JobOptions {
  style: string;
  duration: "short" | "long";
}

function saveStory(
  jobId: string,
  baslik: string,
  hikaye: string,
  seslendirme: string,
  sahnelerTr: string[],
  sahnelerEn: string[],
  visualStyleGuide: VisualStyleGuide,
  prompt: string,
  style: string,
  duration: string
): void {
  const db = getDb();
  db.prepare(`
    INSERT OR REPLACE INTO stories
      (job_id, baslik, hikaye, seslendirme, sahneler_tr, sahneler_en, visual_style_guide, prompt, style, duration, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
  `).run(
    jobId,
    baslik,
    hikaye,
    seslendirme,
    JSON.stringify(sahnelerTr),
    JSON.stringify(sahnelerEn),
    JSON.stringify(visualStyleGuide),
    prompt,
    style,
    duration
  );
}

async function processJob(jobId: string): Promise<void> {
  const job = getJob(jobId);
  if (!job) {
    console.error(`❌ Job ${jobId} not found`);
    return;
  }

  // Mark as processing
  updateJobStatus(jobId, "processing", 10);
  console.log(`⚙️  Processing job ${jobId}: "${job.prompt}"`);

  try {
    const options = job.options ? (JSON.parse(job.options) as JobOptions) : null;
    const style = options?.style || "drama";
    const duration = options?.duration || "short";

    // Update progress - calling Claude
    updateJobStatus(jobId, "processing", 30);

    const result = await generateStory(job.prompt, style, duration);

    // Update progress - saving
    updateJobStatus(jobId, "processing", 80);

    // Save story to stories table
    saveStory(
      jobId,
      result.baslik,
      result.hikaye,
      result.seslendirme,
      result.sahneler_tr,
      result.sahneler_en,
      result.visual_style_guide,
      job.prompt,
      style,
      duration
    );

    // Mark job as completed with result
    updateJobStatus(jobId, "completed", 100, JSON.stringify(result));
    console.log(`✅ Job ${jobId} completed: "${result.baslik}" (${result.sahneler_tr.length} sahne)`);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    updateJobStatus(jobId, "failed", 0, undefined, message);
    console.error(`❌ Job ${jobId} failed:`, message);
  }
}

// Simple in-process queue polling
let isRunning = false;
let pollInterval: ReturnType<typeof setInterval> | null = null;

async function pollQueue(): Promise<void> {
  if (isRunning) return;

  const db = getDb();
  const pendingJob = db
    .prepare("SELECT id FROM jobs WHERE status = 'queued' ORDER BY created_at ASC LIMIT 1")
    .get() as { id: string } | undefined;

  if (!pendingJob) return;

  isRunning = true;
  try {
    await processJob(pendingJob.id);
  } finally {
    isRunning = false;
  }
}

export function startWorker(): void {
  console.log("👷 Story worker started (polling every 2s)");
  pollInterval = setInterval(() => {
    pollQueue().catch((err) => {
      console.error("Worker poll error:", err);
    });
  }, 2000);
}

export function stopWorker(): void {
  if (pollInterval) {
    clearInterval(pollInterval);
    pollInterval = null;
    console.log("👷 Story worker stopped");
  }
}
