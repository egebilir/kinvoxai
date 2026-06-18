import fs from "fs";
import path from "path";
import https from "https";
import http from "http";

const IMAGES_DIR = path.resolve(__dirname, "../../public/images");
const REPLICATE_MODEL = "stability-ai/sdxl";
const POLL_INTERVAL_MS = 2000;
const MAX_POLL_ATTEMPTS = 60; // ~2 minutes total

interface ReplicatePrediction {
  id: string;
  status: "starting" | "processing" | "succeeded" | "failed" | "canceled";
  output: string[] | string | null;
  error: string | null;
}

interface ReplicateModel {
  latest_version?: { id: string };
}

class ReplicateApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "ReplicateApiError";
  }
}

// stability-ai/sdxl is a community model, not one of Replicate's "official"
// models, so it doesn't support the /v1/models/{owner}/{name}/predictions
// shorthand (that 404s). We have to resolve its current version id and use
// the general /v1/predictions endpoint instead. Cache the resolved id
// (shared across the concurrent per-scene calls) so we only look it up once.
let cachedVersionId: Promise<string> | null = null;

async function getLatestVersionId(apiToken: string): Promise<string> {
  if (!cachedVersionId) {
    cachedVersionId = (async () => {
      const response = await fetch(`https://api.replicate.com/v1/models/${REPLICATE_MODEL}`, {
        headers: { Authorization: `Bearer ${apiToken}` },
      });

      if (!response.ok) {
        const errBody = await response.text();
        throw new Error(`Replicate API error (${response.status}) resolving model version: ${errBody}`);
      }

      const model = (await response.json()) as ReplicateModel;
      const versionId = model.latest_version?.id;
      if (!versionId) {
        throw new Error(`Replicate model ${REPLICATE_MODEL} has no latest_version`);
      }
      return versionId;
    })();

    // Don't cache a failed lookup — let the next call retry.
    cachedVersionId.catch(() => {
      cachedVersionId = null;
    });
  }

  return cachedVersionId;
}

function ensureDir(dir: string): void {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function downloadImage(url: string, dest: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    const client = url.startsWith("https") ? https : http;
    client
      .get(url, (response) => {
        // Follow redirects
        if (response.statusCode === 301 || response.statusCode === 302) {
          const redirectUrl = response.headers.location;
          if (redirectUrl) {
            downloadImage(redirectUrl, dest).then(resolve).catch(reject);
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
  const versionId = await getLatestVersionId(apiToken);

  const response = await fetch("https://api.replicate.com/v1/predictions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiToken}`,
      "Content-Type": "application/json",
      // Ask Replicate to hold the request open until the prediction finishes
      // (bounded by their own timeout); we still poll below as a fallback.
      Prefer: "wait",
    },
    body: JSON.stringify({
      version: versionId,
      input: {
        prompt,
        width: 1024,
        height: 1024,
        num_inference_steps: 25,
        guidance_scale: 7.5,
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
      throw new Error("Replicate prediction timed out");
    }
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
    current = await getPrediction(current.id, apiToken);
    attempts++;
  }

  return current;
}

function extractImageUrl(prediction: ReplicatePrediction): string {
  if (Array.isArray(prediction.output) && prediction.output.length > 0) {
    return prediction.output[0];
  }
  if (typeof prediction.output === "string" && prediction.output.length > 0) {
    return prediction.output;
  }
  throw new Error("No image URL in Replicate prediction output");
}

/**
 * Generate an image from a scene description using Replicate's
 * stability-ai/sdxl model. Returns the remote image URL — callers are
 * responsible for downloading/persisting it (see saveImageLocally).
 */
// Replicate billing can lag a few seconds behind a credit top-up, returning
// 402 even with a non-zero balance. Worth one short retry before giving up.
const INSUFFICIENT_CREDIT_RETRY_DELAY_MS = 10_000;

export async function generateImage(prompt: string): Promise<string> {
  const apiToken = getApiToken();

  console.log(`🎨 Replicate: generating image (${prompt.length} chars prompt)...`);

  let created: ReplicatePrediction;
  try {
    created = await createPrediction(prompt, apiToken);
  } catch (err) {
    if (err instanceof ReplicateApiError && err.status === 402) {
      console.warn("⏳ Replicate: 402 insufficient credit, retrying once after a short delay...");
      await new Promise((resolve) => setTimeout(resolve, INSUFFICIENT_CREDIT_RETRY_DELAY_MS));
      created = await createPrediction(prompt, apiToken);
    } else {
      throw err;
    }
  }

  if (created.status === "failed" || created.status === "canceled") {
    throw new Error(created.error || `Replicate prediction ${created.status}`);
  }

  const finished = created.status === "succeeded" ? created : await waitForPrediction(created, apiToken);

  if (finished.status !== "succeeded") {
    throw new Error(finished.error || `Replicate prediction ${finished.status}`);
  }

  const imageUrl = extractImageUrl(finished);
  console.log(`✅ Replicate: prediction succeeded (${finished.id})`);
  return imageUrl;
}

/**
 * Download a (Replicate-hosted) image URL to
 * backend/public/images/[jobId]/scene-[sceneIndex+1].png and return the
 * path the frontend should request it from (served by the /images static route).
 */
export async function saveImageLocally(
  imageUrl: string,
  jobId: string,
  sceneIndex: number
): Promise<string> {
  const jobDir = path.join(IMAGES_DIR, jobId);
  ensureDir(jobDir);

  const filename = `scene-${sceneIndex + 1}.png`;
  const outputPath = path.join(jobDir, filename);

  await downloadImage(imageUrl, outputPath);

  return `/images/${jobId}/${filename}`;
}
