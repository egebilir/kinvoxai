import { Router, type Request, type Response } from "express";
import { z } from "zod";
import { getDb } from "../config/database";
import { generateImages } from "../services/dalle";

export const generateImagesRouter = Router();

const GenerateImagesSchema = z.object({
  jobId: z.string().min(1, "jobId is required"),
  scenes: z.array(z.string().min(1)).min(1, "At least 1 scene is required").max(20),
});

generateImagesRouter.post("/", async (req: Request, res: Response) => {
  try {
    const body = GenerateImagesSchema.parse(req.body);

    // Verify the job exists and has a story
    const db = getDb();
    const story = db.prepare("SELECT * FROM stories WHERE job_id = ?").get(body.jobId) as
      | { job_id: string; image_paths: string | null }
      | undefined;

    if (!story) {
      res.status(404).json({ error: "Story not found for this jobId" });
      return;
    }

    // Check if images already generated
    if (story.image_paths) {
      const existingPaths = JSON.parse(story.image_paths) as string[];
      if (existingPaths.length > 0 && existingPaths[0] !== "/images/placeholder.svg") {
        res.json({
          jobId: body.jobId,
          status: "already_completed",
          imagePaths: existingPaths,
        });
        return;
      }
    }

    console.log(`🖼️  Starting image generation for job ${body.jobId} (${body.scenes.length} scenes)`);

    // Generate images (this is async and takes time)
    const result = await generateImages(body.jobId, body.scenes);

    // Save image paths to database
    db.prepare("UPDATE stories SET image_paths = ? WHERE job_id = ?").run(
      JSON.stringify(result.imagePaths),
      body.jobId
    );

    console.log(
      `🖼️  Image generation complete for job ${body.jobId}: ${result.imagePaths.length} images, ${result.errors.length} errors`
    );

    res.json({
      jobId: body.jobId,
      status: result.errors.length === 0 ? "completed" : "partial",
      imagePaths: result.imagePaths,
      errors: result.errors.length > 0 ? result.errors : undefined,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: "Validation failed", details: error.errors });
      return;
    }
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Image generation route error:", message);
    res.status(500).json({ error: message });
  }
});
