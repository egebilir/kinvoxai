import { Router, type Request, type Response } from "express";
import { z } from "zod";
import { enqueueJob } from "../config/queue";

export const generateRouter = Router();

const GenerateRequestSchema = z.object({
  prompt: z.string().min(1).max(10000),
  type: z.enum(["text", "image", "audio"]).default("text"),
  options: z
    .object({
      model: z.string().optional(),
      temperature: z.number().min(0).max(2).optional(),
    })
    .optional(),
});

generateRouter.post("/", (req: Request, res: Response) => {
  try {
    const body = GenerateRequestSchema.parse(req.body);

    const jobId = `job_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

    const job = enqueueJob(jobId, body.prompt, body.type, body.options);

    res.status(202).json({
      jobId: job.id,
      status: job.status,
      message: "Generation request accepted",
      type: body.type,
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
