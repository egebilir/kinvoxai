import { Router, type Request, type Response } from "express";
import { getJob, listRecentJobs } from "../config/queue";

export const statusRouter = Router();

statusRouter.get("/:jobId", (req: Request<{ jobId: string }>, res: Response) => {
  try {
    const { jobId } = req.params;

    const job = getJob(jobId);

    if (!job) {
      res.status(404).json({
        error: "Job not found",
        jobId,
      });
      return;
    }

    res.json({
      jobId: job.id,
      status: job.status,
      progress: job.progress,
      type: job.type,
      result: job.result ? JSON.parse(job.result) : null,
      error: job.error,
      createdAt: job.created_at,
      updatedAt: job.updated_at,
    });
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
