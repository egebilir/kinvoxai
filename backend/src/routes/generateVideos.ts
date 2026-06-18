import { Router, type Request, type Response } from "express";
import { z } from "zod";
import { getDb } from "../config/database";
import { generateVideoClip } from "../services/seedance";

export const generateVideosRouter = Router();

const GenerateVideosSchema = z.object({
  jobId: z.string().min(1, "jobId is required"),
  scenes: z.array(z.string().min(1)).min(1, "At least 1 scene is required").max(20),
});

generateVideosRouter.post("/", async (req: Request, res: Response) => {
  try {
    const body = GenerateVideosSchema.parse(req.body);

    // Verify the job exists and has a story
    const db = getDb();
    const story = db.prepare("SELECT * FROM stories WHERE job_id = ?").get(body.jobId) as
      | { job_id: string; video_paths: string | null }
      | undefined;

    if (!story) {
      res.status(404).json({ error: "Story not found for this jobId" });
      return;
    }

    // Reuse already-successful clips on retry — each clip costs real money
    // (~$0.18), so a partial failure shouldn't force repaying for the ones
    // that already worked.
    const existingPaths: (string | null)[] = story.video_paths ? JSON.parse(story.video_paths) : [];

    if (existingPaths.length === body.scenes.length && existingPaths.every((p) => p !== null)) {
      res.json({
        status: "videos_generated",
        jobId: body.jobId,
        videoPaths: existingPaths,
      });
      return;
    }

    const indicesToGenerate = body.scenes
      .map((_, index) => index)
      .filter((index) => !existingPaths[index]);

    console.log(
      `🎬 Starting video generation for job ${body.jobId} (${indicesToGenerate.length}/${body.scenes.length} scenes need generation)`
    );

    const results = await Promise.all(
      indicesToGenerate.map((index) => generateVideoClip(body.scenes[index], body.jobId, index + 1))
    );

    const videoPaths: (string | null)[] = [...existingPaths];
    indicesToGenerate.forEach((index, i) => {
      videoPaths[index] = results[i];
    });

    const failedCount = videoPaths.filter((p) => p === null).length;

    db.prepare("UPDATE stories SET video_paths = ? WHERE job_id = ?").run(
      JSON.stringify(videoPaths),
      body.jobId
    );

    console.log(
      `🎬 Video generation complete for job ${body.jobId}: ${videoPaths.length - failedCount}/${videoPaths.length} succeeded`
    );

    res.json({
      status: failedCount === 0 ? "videos_generated" : "videos_partial",
      jobId: body.jobId,
      videoPaths,
      failedCount: failedCount > 0 ? failedCount : undefined,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: "Validation failed", details: error.errors });
      return;
    }
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Video generation route error:", message);
    res.status(500).json({ error: message });
  }
});
