import { Router, type Request, type Response } from "express";
import { z } from "zod";
import { getDb } from "../config/database";
import { generateImage, saveImageLocally } from "../services/replicate";

export const generateImagesRouter = Router();

const GenerateImagesSchema = z.object({
  jobId: z.string().min(1, "jobId is required"),
  scenes: z.array(z.string().min(1)).min(1, "At least 1 scene is required").max(20),
});

interface SceneImageResult {
  index: number;
  path: string;
  error: string | null;
}

async function generateSceneImage(jobId: string, scenePrompt: string, index: number): Promise<SceneImageResult> {
  try {
    const remoteUrl = await generateImage(scenePrompt);
    const localPath = await saveImageLocally(remoteUrl, jobId, index);
    return { index, path: localPath, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error(`❌ Scene ${index + 1}: ${message}`);
    return { index, path: "/images/placeholder.svg", error: `Scene ${index + 1}: ${message}` };
  }
}

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

    // Check if images already generated — only skip regeneration if every
    // scene succeeded. A previous partial failure (one scene still a
    // placeholder) must not be reported as already_completed, otherwise
    // that scene can never be retried.
    const existingPaths: string[] = story.image_paths ? JSON.parse(story.image_paths) : [];
    const isPlaceholder = (p: string | undefined) => !p || p === "/images/placeholder.svg";

    if (existingPaths.length === body.scenes.length && existingPaths.every((p) => !isPlaceholder(p))) {
      res.json({
        jobId: body.jobId,
        status: "already_completed",
        imagePaths: existingPaths,
      });
      return;
    }

    // Only (re)generate scenes that don't already have a successful image,
    // so a retry after a partial failure doesn't re-pay for scenes that
    // already succeeded.
    const indicesToGenerate = body.scenes
      .map((_, index) => index)
      .filter((index) => isPlaceholder(existingPaths[index]));

    console.log(
      `🖼️  Starting image generation for job ${body.jobId} (${indicesToGenerate.length}/${body.scenes.length} scenes need generation)`
    );

    const sceneResults = await Promise.all(
      indicesToGenerate.map((index) => generateSceneImage(body.jobId, body.scenes[index], index))
    );

    const imagePaths: string[] = [...existingPaths];
    const errors: string[] = [];
    for (const { index, path: imagePath, error } of sceneResults) {
      imagePaths[index] = imagePath;
      if (error) errors.push(error);
    }

    // Save image paths to database
    db.prepare("UPDATE stories SET image_paths = ? WHERE job_id = ?").run(
      JSON.stringify(imagePaths),
      body.jobId
    );

    console.log(
      `🖼️  Image generation complete for job ${body.jobId}: ${imagePaths.length} images, ${errors.length} errors`
    );

    res.json({
      jobId: body.jobId,
      status: errors.length === 0 ? "completed" : "partial",
      imagePaths,
      errors: errors.length > 0 ? errors : undefined,
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
