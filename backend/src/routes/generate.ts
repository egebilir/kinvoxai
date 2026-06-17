import { Router, type Request, type Response } from "express";
import { z } from "zod";
import { enqueueJob } from "../config/queue";

export const generateRouter = Router();

const GenerateRequestSchema = z.object({
  story_prompt: z.string().min(1, "Story prompt is required").max(10000),
  duration: z.enum(["short", "long"]),
  style: z.enum(["horror", "adventure", "comedy", "drama", "scifi"]),
});

generateRouter.post("/", (req: Request, res: Response) => {
  try {
    const body = GenerateRequestSchema.parse(req.body);

    const jobId = `job_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

    const job = enqueueJob(jobId, body.story_prompt, "story", {
      style: body.style,
      duration: body.duration,
    });

    res.status(202).json({
      jobId: job.id,
      status: job.status,
      message: "Story generation started",
      duration: body.duration,
      style: body.style,
      createdAt: job.created_at,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        error: "Validation failed",
        details: error.errors,
      });
      return;
    }

    const message = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ error: message });
  }
});
