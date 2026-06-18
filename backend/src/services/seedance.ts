import fs from "fs";
import path from "path";
import https from "https";
import http from "http";

const VIDEOS_DIR = path.resolve(__dirname, "../../public/videos");

// bytedance/seedance-1-lite is one of Replicate's "official" models, so
// (unlike stability-ai/sdxl, which 404s on this) it supports the
// /v1/models/{owner}/{name}/predictions shorthand directly — no version-hash
// resolution needed.
const REPLICATE_MODEL = "bytedance/seedance-1-lite";

const POLL_INTERVAL_MS = 3000;
const MAX_POLL_ATTEMPTS = 100; // ~5 minutes — video generation is slower than images

interface ReplicatePrediction {
  id: string;
  status: "starting" | "processing" | "succeeded" | "failed" | "canceled";
  output: string[] | string | null;
  error: string | null;
}

class ReplicateApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "ReplicateApiError";
  }
}

function ensureDir(dir: string): void {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function downloadFile(url: string, dest: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    const client = url.startsWith("https") ? https : http;
    client
      .get(url, (response) => {
        // Follow redirects
        if (response.statusCode === 301 || response.statusCode === 302) {
          const redirectUrl = response.headers.location;
          if (redirectUrl) {
            downloadFile(redirectUrl, dest).then(resolve).catch(reject);
            return;
          }
        }
        response.pipe(file);
        file.on("finish", () => {
          file.close();
          resolve();
        });
      })
      .on("error", (err) => {
        fs.unlink(dest, () => {});
        reject(err);
      });
  });
}

function getApiToken(): string {
  const apiToken = process.env.REPLICATE_API_TOKEN;
  if (!apiToken) {
    throw new Error("REPLICATE_API_TOKEN is not set in environment variables");
  }
  return apiToken;
}

async function createPrediction(prompt: string, apiToken: string): Promise<ReplicatePrediction> {
  const response = await fetch(`https://api.replicate.com/v1/models/${REPLICATE_MODEL}/predictions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiToken}`,
      "Content-Type": "application/json",
      // Ask Replicate to hold the request open until the prediction finishes
      // (bounded by their own timeout); we still poll below as a fallback.
      Prefer: "wait",
    },
    body: JSON.stringify({
      input: {
        prompt,
        duration: 5,
        aspect_ratio: "9:16",
        resolution: 720,
      },
    }),
  });

  if (!response.ok) {
    const errBody = await response.text();
    throw new ReplicateApiError(response.status, `Replicate API error (${response.status}): ${errBody}`);
  }

  return (await response.json()) as ReplicatePrediction;
}

async function getPrediction(id: string, apiToken: string): Promise<ReplicatePrediction> {
  const response = await fetch(`https://api.replicate.com/v1/predictions/${id}`, {
    headers: { Authorization: `Bearer ${apiToken}` },
  });

  if (!response.ok) {
    const errBody = await response.text();
    throw new Error(`Replicate API error (${response.status}): ${errBody}`);
  }

  return (await response.json()) as ReplicatePrediction;
}

async function waitForPrediction(prediction: ReplicatePrediction, apiToken: string): Promise<ReplicatePrediction> {
  let current = prediction;
  let attempts = 0;

  while (current.status !== "succeeded" && current.status !== "failed" && current.status !== "canceled") {
    if (attempts >= MAX_POLL_ATTEMPTS) {
      throw new Error("Seedance prediction timed out");
    }
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
    current = await getPrediction(current.id, apiToken);
    attempts++;
  }

  return current;
}

function extractVideoUrl(prediction: ReplicatePrediction): string {
  if (Array.isArray(prediction.output) && prediction.output.length > 0) {
    return prediction.output[0];
  }
  if (typeof prediction.output === "string" && prediction.output.length > 0) {
    return prediction.output;
  }
  throw new Error("No video URL in Seedance prediction output");
}

// Replicate can rate-limit (429) under burst load — worth one short retry.
const RATE_LIMIT_RETRY_DELAY_MS = 5_000;

/**
 * Generate a single 5-second video clip from a scene description using
 * bytedance/seedance-1-lite, and save it to
 * backend/public/videos/[jobId]/scene-[sceneNumber].mp4.
 *
 * Returns the local /videos/... path the frontend can request it from, or
 * null if generation failed (caller should skip this scene rather than
 * fail the whole batch).
 */
export async function generateVideoClip(
  scenePrompt: string,
  jobId: string,
  sceneNumber: number
): Promise<string | null> {
  try {
    const apiToken = getApiToken();

    console.log(`🎬 Seedance: generating scene ${sceneNumber} (${scenePrompt.length} chars prompt)...`);

    let created: ReplicatePrediction;
    try {
      created = await createPrediction(scenePrompt, apiToken);
    } catch (err) {
      if (err instanceof ReplicateApiError && err.status === 429) {
        console.warn(`⏳ Seedance: scene ${sceneNumber} rate-limited (429), retrying once after 5s...`);
        await new Promise((resolve) => setTimeout(resolve, RATE_LIMIT_RETRY_DELAY_MS));
        created = await createPrediction(scenePrompt, apiToken);
      } else {
        throw err;
      }
    }

    if (created.status === "failed" || created.status === "canceled") {
      throw new Error(created.error || `Seedance prediction ${created.status}`);
    }

    const finished = created.status === "succeeded" ? created : await waitForPrediction(created, apiToken);

    if (finished.status !== "succeeded") {
      throw new Error(finished.error || `Seedance prediction ${finished.status}`);
    }

    const videoUrl = extractVideoUrl(finished);

    const jobDir = path.join(VIDEOS_DIR, jobId);
    ensureDir(jobDir);
    const filename = `scene-${sceneNumber}.mp4`;
    const outputPath = path.join(jobDir, filename);

    await downloadFile(videoUrl, outputPath);

    console.log(`✅ Seedance: scene ${sceneNumber} saved to ${outputPath}`);
    return `/videos/${jobId}/${filename}`;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error(`❌ Seedance: scene ${sceneNumber} failed: ${message}`);
    return null;
  }
}
