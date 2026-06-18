import OpenAI from "openai";
import fs from "fs";
import path from "path";
import https from "https";
import http from "http";

const IMAGES_DIR = path.resolve(__dirname, "../../public/images");

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

function saveBase64Image(b64: string, dest: string): void {
  fs.writeFileSync(dest, Buffer.from(b64, "base64"));
}

export interface ImageGenerationResult {
  imagePaths: string[];
  errors: string[];
}

async function generateSingleImage(
  client: OpenAI,
  prompt: string,
  outputPath: string,
  sceneIndex: number
): Promise<{ success: boolean; error?: string }> {
  const maxRetries = 2;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`🎨 Scene ${sceneIndex + 1} (attempt ${attempt}): Generating image...`);

      const response = await client.images.generate({
        model: "gpt-image-1",
        prompt: prompt,
        n: 1,
        size: "1024x1024",
        quality: "high",
      });

      if (!response.data || response.data.length === 0) {
        throw new Error("No data in image generation response");
      }
      const image = response.data[0];
      if (image?.b64_json) {
        saveBase64Image(image.b64_json, outputPath);
      } else if (image?.url) {
        await downloadImage(image.url, outputPath);
      } else {
        throw new Error("No image data (b64_json or url) in response");
      }

      console.log(`✅ Scene ${sceneIndex + 1}: Image saved to ${outputPath}`);
      return { success: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      console.error(`❌ Scene ${sceneIndex + 1} (attempt ${attempt}): ${message}`);

      if (attempt === maxRetries) {
        return { success: false, error: message };
      }

      // Wait 2s before retry
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }

  return { success: false, error: "Max retries exceeded" };
}

export async function generateImages(
  jobId: string,
  scenes: string[]
): Promise<ImageGenerationResult> {
  const apiKey = process.env.DALLE_API_KEY;
  if (!apiKey) {
    throw new Error("DALLE_API_KEY is not set in environment variables");
  }

  const client = new OpenAI({ apiKey });
  const jobDir = path.join(IMAGES_DIR, jobId);
  ensureDir(jobDir);

  const imagePaths: string[] = [];
  const errors: string[] = [];

  // Generate images in parallel (batches of 3 to respect rate limits)
  const batchSize = 3;
  for (let i = 0; i < scenes.length; i += batchSize) {
    const batch = scenes.slice(i, i + batchSize);
    const batchPromises = batch.map((scenePrompt, batchIdx) => {
      const sceneIdx = i + batchIdx;
      const filename = `scene-${sceneIdx + 1}.png`;
      const outputPath = path.join(jobDir, filename);

      return generateSingleImage(client, scenePrompt, outputPath, sceneIdx).then(
        (result) => ({
          index: sceneIdx,
          filename,
          result,
        })
      );
    });

    const batchResults = await Promise.all(batchPromises);

    for (const { index, filename, result } of batchResults) {
      if (result.success) {
        imagePaths[index] = `/images/${jobId}/${filename}`;
      } else {
        imagePaths[index] = `/images/placeholder.svg`;
        errors.push(`Scene ${index + 1}: ${result.error || "Unknown error"}`);
      }
    }
  }

  return { imagePaths, errors };
}
