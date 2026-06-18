import { Router, type Request, type Response } from "express";
import { getJob, listRecentJobs } from "../config/queue";
import { getDb } from "../config/database";

export const statusRouter = Router();

interface StoryRow {
  baslik: string;
  hikaye: string;
  seslendirme: string;
  sahneler_tr: string;
  sahneler_en: string;
  image_paths: string | null;
  visual_style_guide: string | null;
  video_paths: string | null;
  final_video_path: string | null;
  style: string;
  duration: string;
  created_at: string;
}

statusRouter.get("/:jobId", (req: Request<{ jobId: string }>, res: Response) => {
  try {
    const { jobId } = req.params;
    const job = getJob(jobId);

    if (!job) {
      res.status(404).json({ error: "Job not found", jobId });
      return;
    }

    // Base response
    const response: Record<string, unknown> = {
      jobId: job.id,
      status: job.status,
      progress: job.progress,
      type: job.type,
      error: job.error,
      createdAt: job.created_at,
      updatedAt: job.updated_at,
    };

    // If completed, include story data from stories table
    if (job.status === "completed" && job.type === "story") {
      const db = getDb();
      const story = db.prepare("SELECT * FROM stories WHERE job_id = ?").get(jobId) as StoryRow | undefined;

      if (story) {
        const sahnelerTr = JSON.parse(story.sahneler_tr) as string[];
        const sahnelerEn = JSON.parse(story.sahneler_en) as string[];

        response.result = {
          baslik: story.baslik,
          hikaye: story.hikaye,
          seslendirme: story.seslendirme,
          sahneler_tr: sahnelerTr,
          sahneler_en: sahnelerEn,
          imagePaths: story.image_paths ? (JSON.parse(story.image_paths) as string[]) : null,
          visualStyleGuide: story.visual_style_guide ? JSON.parse(story.visual_style_guide) : null,
          videoPaths: story.video_paths ? (JSON.parse(story.video_paths) as (string | null)[]) : null,
          finalVideoPath: story.final_video_path || null,
          style: story.style,
          duration: story.duration,
          sahneSayisi: sahnelerTr.length,
          completedAt: story.created_at,
        };
      }
    } else if (job.result) {
      response.result = JSON.parse(job.result);
    }

    res.json(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ error: message });
  }
});

statusRouter.get("/", (_req: Request, res: Response) => {
  try {
    const jobs = listRecentJobs(20);

    res.json({
      jobs: jobs.map((j) => ({
        jobId: j.id,
        status: j.status,
        type: j.type,
        progress: j.progress,
        createdAt: j.created_at,
      })),
      total: jobs.length,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ error: message });
  }
});
