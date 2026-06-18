import { Router, type Request, type Response } from "express";
import { z } from "zod";
import { execFile } from "child_process";
import fs from "fs";
import path from "path";
import { getDb } from "../config/database";

export const assembleVideosRouter = Router();

const AssembleVideosSchema = z.object({
  jobId: z.string().min(1, "jobId is required"),
});

const VIDEOS_DIR = path.resolve(__dirname, "../../public/videos");

function runFfmpeg(args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    execFile("ffmpeg", args, (error, _stdout, stderr) => {
      if (error) {
        const hint = (error as NodeJS.ErrnoException).code === "ENOENT" ? " — is ffmpeg installed and on PATH?" : "";
        reject(new Error((stderr || error.message) + hint));
        return;
      }
      resolve();
    });
  });
}

assembleVideosRouter.post("/", async (req: Request, res: Response) => {
  try {
    const body = AssembleVideosSchema.parse(req.body);

    const db = getDb();
    const story = db.prepare("SELECT * FROM stories WHERE job_id = ?").get(body.jobId) as
      | { job_id: string; video_paths: string | null }
      | undefined;

    if (!story) {
      res.status(404).json({ error: "Story not found for this jobId" });
      return;
    }

    if (!story.video_paths) {
      res.status(400).json({ error: "No video clips generated yet for this jobId" });
      return;
    }

    const videoPaths = JSON.parse(story.video_paths) as (string | null)[];
    const clipFilenames = videoPaths.filter((p): p is string => p !== null).map((p) => path.basename(p));

    if (clipFilenames.length === 0) {
      res.status(400).json({ error: "No successful video clips to assemble" });
      return;
    }

    const jobDir = path.join(VIDEOS_DIR, body.jobId);
    const concatListPath = path.join(jobDir, "concat.txt");
    const finalOutputPath = path.join(jobDir, "final.mp4");

    // Use absolute, forward-slash paths in the concat list — relative paths
    // in the ffmpeg concat demuxer are resolved against the process's
    // working directory, not the list file's directory, and backslashes are
    // an escape character in the demuxer's mini-language (breaks on Windows).
    const concatContent = clipFilenames
      .map((filename) => `file '${path.join(jobDir, filename).replace(/\\/g, "/")}'`)
      .join("\n");
    fs.writeFileSync(concatListPath, concatContent, "utf-8");

    console.log(`🎬 Assembling ${clipFilenames.length} clips for job ${body.jobId}...`);

    await runFfmpeg(["-y", "-f", "concat", "-safe", "0", "-i", concatListPath, "-c", "copy", finalOutputPath]);

    const finalVideoPath = `/videos/${body.jobId}/final.mp4`;
    db.prepare("UPDATE stories SET final_video_path = ? WHERE job_id = ?").run(finalVideoPath, body.jobId);

    console.log(`✅ Final video assembled for job ${body.jobId}: ${finalVideoPath}`);

    res.json({
      status: "completed",
      jobId: body.jobId,
      finalVideoPath,
      clipsUsed: clipFilenames.length,
      clipsSkipped: videoPaths.length - clipFilenames.length,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: "Validation failed", details: error.errors });
      return;
    }
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Video assembly route error:", message);
    res.status(500).json({ error: message });
  }
});
