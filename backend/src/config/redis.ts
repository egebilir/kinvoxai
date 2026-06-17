import { Redis } from "ioredis";

let redisClient: Redis | null = null;

export function getRedis(): Redis {
  if (!redisClient) {
    throw new Error("Redis not initialized. Call connectRedis() first.");
  }
  return redisClient;
}

export async function connectRedis(): Promise<void> {
  redisClient = new Redis(process.env.REDIS_URL || "redis://localhost:6379", {
    maxRetriesPerRequest: null,
    enableReadyCheck: true,
    retryStrategy(times: number): number {
      return Math.min(times * 50, 2000);
    },
  });

  await new Promise<void>((resolve, reject) => {
    redisClient!.on("ready", resolve);
    redisClient!.on("error", reject);
  });
}

export async function disconnectRedis(): Promise<void> {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
  }
}
