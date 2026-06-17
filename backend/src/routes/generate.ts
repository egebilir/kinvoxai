import { Router, type Request, type Response } from "express";
import { z } from "zod";

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

type GenerateRequest = z.infer<typeof GenerateRequestSchema>;

generateRouter.post("/", async (req: Request, res: Response) => {
  try {
    const body = GenerateRequestSchema.parse(req.body) as GenerateRequest;

    // TODO: Add job to Bull queue for async processing
    const jobId = `job_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

    res.status(202).json({
      jobId,
      status: "queued",
      message: "Generation request accepted",
      type: body.type,
      createdAt: new Date().toISOString(),
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
